"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";
import type { AttendanceStatus } from "@prisma/client";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function saveAttendanceForDate(
  date: string,
  records: { employeeId: string; status: AttendanceStatus }[]
): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);
    const attendanceDate = new Date(date);

    await prisma.$transaction(
      records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: r.employeeId, date: attendanceDate } },
          update: { status: r.status },
          create: { employeeId: r.employeeId, date: attendanceDate, status: r.status },
        })
      )
    );

    await logAudit({ actorUserId: session.id, action: "MARK_ATTENDANCE", entityType: "AttendanceRecord", entityId: date, after: { count: records.length } });
    revalidatePath("/attendance");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
