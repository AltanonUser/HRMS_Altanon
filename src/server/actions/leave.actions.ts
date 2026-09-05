"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireSession, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { leaveRequestSchema, type LeaveRequestInput } from "@/lib/validation/leave.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

function countDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000) + 1;
}

export async function applyForLeave(input: LeaveRequestInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (!session.employeeId) return { success: false, error: "Your account isn't linked to an employee profile." };

    const parsed = leaveRequestSchema.parse(input);
    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);
    if (endDate < startDate) return { success: false, error: "End date must be after start date." };

    const days = countDays(startDate, endDate);
    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    if (!employee) return { success: false, error: "Employee profile not found." };

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: session.employeeId,
        leaveTypeId: parsed.leaveTypeId,
        startDate,
        endDate,
        days,
        reason: parsed.reason || null,
        status: "PENDING",
        approverId: employee.reportingManagerId,
      },
    });

    await logAudit({ actorUserId: session.id, action: "APPLY_LEAVE", entityType: "LeaveRequest", entityId: request.id });
    revalidatePath("/me/leave");
    revalidatePath("/leave/approvals");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function decideLeaveRequest(requestId: string, approve: boolean): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_APPROVE_TEAM);

    const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) return { success: false, error: "Leave request not found." };
    if (request.status !== "PENDING") return { success: false, error: "This request has already been decided." };

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: approve ? "APPROVED" : "REJECTED", approvedAt: new Date() },
    });

    if (approve) {
      const year = request.startDate.getFullYear();
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } },
        update: { used: { increment: Number(request.days) } },
        create: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year, used: Number(request.days) },
      });
    }

    await logAudit({
      actorUserId: session.id,
      action: approve ? "APPROVE_LEAVE" : "REJECT_LEAVE",
      entityType: "LeaveRequest",
      entityId: requestId,
      after: { status: updated.status },
    });
    revalidatePath("/leave/approvals");
    revalidatePath("/me/leave");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
