"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { employeeSchema, offboardSchema, type EmployeeInput, type OffboardInput } from "@/lib/validation/employee.schema";
import { encryptPII } from "@/lib/utils/encryption";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

async function nextEmployeeCode(): Promise<string> {
  const last = await prisma.employee.findFirst({
    orderBy: { createdAt: "desc" },
    select: { employeeCode: true },
  });
  const lastNum = last ? parseInt(last.employeeCode.replace(/\D/g, ""), 10) || 0 : 0;
  return `ALT-EMP-${String(lastNum + 1).padStart(4, "0")}`;
}

export async function createEmployee(input: EmployeeInput): Promise<ActionResult & { employeeId?: string }> {
  try {
    const session = await requirePermission(PERMISSIONS.EMPLOYEE_CREATE);
    const parsed = employeeSchema.parse(input);

    if (parsed.reportingManagerId) {
      const manager = await prisma.employee.findUnique({ where: { id: parsed.reportingManagerId } });
      if (!manager) return { success: false, error: "Selected reporting manager does not exist." };
    }

    const employeeCode = await nextEmployeeCode();
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        personalEmail: parsed.personalEmail || null,
        officialEmail: parsed.officialEmail || null,
        phone: parsed.phone || null,
        dob: parsed.dob ? new Date(parsed.dob) : null,
        panNumberEnc: parsed.panNumber ? encryptPII(parsed.panNumber) : null,
        aadhaarNumberEnc: parsed.aadhaarNumber ? encryptPII(parsed.aadhaarNumber) : null,
        bankAccountNameEnc: parsed.bankAccountName ? encryptPII(parsed.bankAccountName) : null,
        bankAccountNumberEnc: parsed.bankAccountNumber ? encryptPII(parsed.bankAccountNumber) : null,
        bankIfscEnc: parsed.bankIfsc ? encryptPII(parsed.bankIfsc) : null,
        bankName: parsed.bankName || null,
        address: parsed.address || null,
        departmentId: parsed.departmentId,
        designationId: parsed.designationId,
        reportingManagerId: parsed.reportingManagerId || null,
        dateOfJoining: new Date(parsed.dateOfJoining),
        employmentType: parsed.employmentType,
        employmentStatus: "ACTIVE",
      },
    });

    await prisma.employeeHistoryEvent.create({
      data: { employeeId: employee.id, eventType: "JOINED", effectiveDate: employee.dateOfJoining, createdById: session.id },
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Employee", entityId: employee.id, after: { employeeCode } });
    revalidatePath("/employees");
    return { success: true, employeeId: employee.id };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.EMPLOYEE_UPDATE);
    const parsed = employeeSchema.parse(input);

    if (parsed.reportingManagerId === id) {
      return { success: false, error: "An employee cannot report to themselves." };
    }
    if (parsed.reportingManagerId) {
      const cycleCheck = await wouldCreateCycle(id, parsed.reportingManagerId);
      if (cycleCheck) return { success: false, error: "This would create a circular reporting chain." };
    }

    const before = await prisma.employee.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Employee not found." };

    const designationChanged = before.designationId !== parsed.designationId;
    const departmentChanged = before.departmentId !== parsed.departmentId;
    const managerChanged = before.reportingManagerId !== (parsed.reportingManagerId || null);

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        personalEmail: parsed.personalEmail || null,
        officialEmail: parsed.officialEmail || null,
        phone: parsed.phone || null,
        dob: parsed.dob ? new Date(parsed.dob) : null,
        ...(parsed.panNumber ? { panNumberEnc: encryptPII(parsed.panNumber) } : {}),
        ...(parsed.aadhaarNumber ? { aadhaarNumberEnc: encryptPII(parsed.aadhaarNumber) } : {}),
        ...(parsed.bankAccountName ? { bankAccountNameEnc: encryptPII(parsed.bankAccountName) } : {}),
        ...(parsed.bankAccountNumber ? { bankAccountNumberEnc: encryptPII(parsed.bankAccountNumber) } : {}),
        ...(parsed.bankIfsc ? { bankIfscEnc: encryptPII(parsed.bankIfsc) } : {}),
        bankName: parsed.bankName || null,
        address: parsed.address || null,
        departmentId: parsed.departmentId,
        designationId: parsed.designationId,
        reportingManagerId: parsed.reportingManagerId || null,
        dateOfJoining: new Date(parsed.dateOfJoining),
        employmentType: parsed.employmentType,
      },
    });

    if (designationChanged) {
      await prisma.employeeHistoryEvent.create({
        data: { employeeId: id, eventType: "DESIGNATION_CHANGE", effectiveDate: new Date(), createdById: session.id },
      });
    }
    if (departmentChanged) {
      await prisma.employeeHistoryEvent.create({
        data: { employeeId: id, eventType: "DEPARTMENT_TRANSFER", effectiveDate: new Date(), createdById: session.id },
      });
    }
    if (managerChanged) {
      await prisma.employeeHistoryEvent.create({
        data: { employeeId: id, eventType: "MANAGER_CHANGE", effectiveDate: new Date(), createdById: session.id },
      });
    }

    await logAudit({ actorUserId: session.id, action: "UPDATE", entityType: "Employee", entityId: id, before, after: employee });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

async function wouldCreateCycle(employeeId: string, proposedManagerId: string): Promise<boolean> {
  let currentId: string | null = proposedManagerId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === employeeId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { reportingManagerId: string | null } | null = await prisma.employee.findUnique({
      where: { id: currentId },
      select: { reportingManagerId: true },
    });
    currentId = current?.reportingManagerId ?? null;
  }
  return false;
}

export async function offboardEmployee(input: OffboardInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.EMPLOYEE_OFFBOARD);
    const parsed = offboardSchema.parse(input);

    const before = await prisma.employee.findUnique({ where: { id: parsed.employeeId } });
    if (!before) return { success: false, error: "Employee not found." };

    const employee = await prisma.employee.update({
      where: { id: parsed.employeeId },
      data: {
        employmentStatus: parsed.status,
        dateOfLeaving: parsed.status === "RELIEVED" || parsed.status === "TERMINATED" ? new Date(parsed.lastWorkingDay) : null,
      },
    });

    await prisma.employeeHistoryEvent.create({
      data: {
        employeeId: parsed.employeeId,
        eventType: parsed.status,
        effectiveDate: new Date(parsed.lastWorkingDay),
        createdById: session.id,
      },
    });

    await logAudit({
      actorUserId: session.id,
      action: "OFFBOARD",
      entityType: "Employee",
      entityId: parsed.employeeId,
      before,
      after: employee,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${parsed.employeeId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
