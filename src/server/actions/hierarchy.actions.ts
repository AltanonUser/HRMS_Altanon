"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { departmentSchema, designationSchema, type DepartmentInput, type DesignationInput } from "@/lib/validation/hierarchy.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function createDepartment(input: DepartmentInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DEPARTMENT_MANAGE);
    const parsed = departmentSchema.parse(input);
    const dept = await prisma.department.create({
      data: {
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        parentDepartmentId: parsed.parentDepartmentId || null,
      },
    });
    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Department", entityId: dept.id, after: dept });
    revalidatePath("/departments");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DEPARTMENT_MANAGE);
    const parsed = departmentSchema.parse(input);
    if (parsed.parentDepartmentId === id) {
      return { success: false, error: "A department cannot be its own parent." };
    }
    const before = await prisma.department.findUnique({ where: { id } });
    const dept = await prisma.department.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        parentDepartmentId: parsed.parentDepartmentId || null,
      },
    });
    await logAudit({ actorUserId: session.id, action: "UPDATE", entityType: "Department", entityId: id, before, after: dept });
    revalidatePath("/departments");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function deactivateDepartment(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DEPARTMENT_MANAGE);
    const employeeCount = await prisma.employee.count({ where: { departmentId: id, employmentStatus: "ACTIVE" } });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot deactivate — ${employeeCount} active employee(s) are in this department.` };
    }
    const dept = await prisma.department.update({ where: { id }, data: { isActive: false } });
    await logAudit({ actorUserId: session.id, action: "DEACTIVATE", entityType: "Department", entityId: id, after: dept });
    revalidatePath("/departments");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function createDesignation(input: DesignationInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DESIGNATION_MANAGE);
    const parsed = designationSchema.parse(input);
    const designation = await prisma.designation.create({
      data: { title: parsed.title, grade: parsed.grade ?? null },
    });
    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Designation", entityId: designation.id, after: designation });
    revalidatePath("/departments");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
