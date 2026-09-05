"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { hashPassword } from "@/lib/auth/password";
import {
  createUserSchema,
  updateUserRoleSchema,
  roleSchema,
  type CreateUserInput,
  type UpdateUserRoleInput,
  type RoleInput,
} from "@/lib/validation/user.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) {
    if (err.message.includes("Unique constraint")) return "A user with this email already exists.";
    return err.message;
  }
  return "Something went wrong.";
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.USER_CREATE);
    const parsed = createUserSchema.parse(input);

    if (parsed.employeeId) {
      const existing = await prisma.user.findUnique({ where: { employeeId: parsed.employeeId } });
      if (existing) return { success: false, error: "This employee already has a login." };
    }

    const passwordHash = await hashPassword(parsed.temporaryPassword);
    const user = await prisma.user.create({
      data: {
        email: parsed.email.trim().toLowerCase(),
        passwordHash,
        roleId: parsed.roleId,
        employeeId: parsed.employeeId || null,
        mustChangePassword: true,
        createdById: session.id,
      },
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "User", entityId: user.id, after: { email: user.email } });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateUserRole(input: UpdateUserRoleInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.USER_UPDATE);
    const parsed = updateUserRoleSchema.parse(input);

    const before = await prisma.user.findUnique({ where: { id: parsed.userId } });
    if (!before) return { success: false, error: "User not found." };

    const user = await prisma.user.update({ where: { id: parsed.userId }, data: { roleId: parsed.roleId } });
    await logAudit({
      actorUserId: session.id,
      action: "UPDATE_ROLE",
      entityType: "User",
      entityId: parsed.userId,
      before: { roleId: before.roleId },
      after: { roleId: user.roleId },
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.USER_DEACTIVATE);
    if (session.id === userId && !isActive) {
      return { success: false, error: "You cannot deactivate your own account." };
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
    await logAudit({
      actorUserId: session.id,
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entityType: "User",
      entityId: userId,
      after: { isActive: user.isActive },
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function createRole(input: RoleInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.ROLE_MANAGE);
    const parsed = roleSchema.parse(input);

    const role = await prisma.role.create({
      data: { name: parsed.name, label: parsed.label, description: parsed.description || null },
    });
    const permissions = await prisma.permission.findMany({ where: { code: { in: parsed.permissionCodes } } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Role", entityId: role.id, after: { name: role.name } });
    revalidatePath("/settings/roles");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.ROLE_MANAGE);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return { success: false, error: "Role not found." };

    const permissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        skipDuplicates: true,
      }),
    ]);

    await logAudit({
      actorUserId: session.id,
      action: "UPDATE_PERMISSIONS",
      entityType: "Role",
      entityId: roleId,
      after: { permissionCodes },
    });
    revalidatePath("/settings/roles");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
