"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentSession } from "@/lib/auth/session";
import { loginSchema, changePasswordSchema, type LoginInput, type ChangePasswordInput } from "@/lib/validation/auth.schema";
import { logAudit } from "@/lib/audit/logger";

export type ActionResult = { success: true } | { success: false; error: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message for "no such user" and "wrong password" throughout — never reveal
  // which one it was, that alone lets an attacker enumerate valid emails.
  const invalidCredentials = { success: false as const, error: "Invalid email or password." };

  if (!user || !user.isActive) return invalidCredentials;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { success: false, error: "Too many failed attempts. Try again in a few minutes." };
  }

  const validPassword = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!validPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const lockingNow = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingNow ? 0 : attempts,
        lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    if (lockingNow) {
      await logAudit({ actorUserId: user.id, action: "LOGIN_LOCKOUT", entityType: "User", entityId: user.id });
      return { success: false, error: "Too many failed attempts. Try again in a few minutes." };
    }
    return invalidCredentials;
  }

  const hdrs = await headers();
  await createSession(user.id, {
    userAgent: hdrs.get("user-agent"),
    ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });
  await logAudit({ actorUserId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await logAudit({ actorUserId: session.id, action: "LOGOUT", entityType: "User", entityId: session.id });
  }
  await destroySession();
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Not signed in." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { success: false, error: "User not found." };

  const validCurrent = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!validCurrent) return { success: false, error: "Current password is incorrect." };

  if (!isPasswordStrongEnough(parsed.data.newPassword)) {
    return { success: false, error: "New password must be at least 10 characters." };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });
  await logAudit({ actorUserId: user.id, action: "CHANGE_PASSWORD", entityType: "User", entityId: user.id });

  return { success: true };
}
