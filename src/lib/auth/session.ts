import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS, type PermissionCode } from "@/lib/rbac/permissions";

export const SESSION_COOKIE_NAME = "hrms_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SessionUser = {
  id: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  employeeId: string | null;
  employeeFullName: string | null;
  role: { id: string; name: string; label: string };
  permissions: Set<PermissionCode>;
};

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null }
): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      userAgent: meta.userAgent ?? undefined,
      ipAddress: meta.ipAddress ?? undefined,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function computeEffectivePermissions(
  rolePermissions: { permission: { code: string } }[],
  overrides: { effect: "GRANT" | "DENY"; permission: { code: string } }[]
): Set<PermissionCode> {
  const set = new Set<string>(rolePermissions.map((rp) => rp.permission.code));
  for (const o of overrides) {
    if (o.effect === "GRANT") set.add(o.permission.code);
    else set.delete(o.permission.code);
  }
  return set as Set<PermissionCode>;
}

/** Reads the session cookie and loads the current user with fresh role/permission data from the DB. */
export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
          overrides: { include: { permission: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const { user } = session;
  if (!user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    employeeId: user.employeeId,
    employeeFullName: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : null,
    role: { id: user.role.id, name: user.role.name, label: user.role.label },
    permissions: computeEffectivePermissions(user.role.permissions, user.overrides),
  };
}

export function hasPermission(user: SessionUser, code: PermissionCode): boolean {
  return user.permissions.has(code);
}

export function hasAnyPermission(user: SessionUser, codes: PermissionCode[]): boolean {
  return codes.some((c) => user.permissions.has(c));
}

export { PERMISSIONS };
