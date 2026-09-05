import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { AttendanceEditor } from "./attendance-editor";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requirePermission(PERMISSIONS.ATTENDANCE_MANAGE);
  const { date } = await searchParams;
  const selectedDate = date ?? new Date().toISOString().slice(0, 10);

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] } },
    orderBy: { firstName: "asc" },
  });

  const existingRecords = await prisma.attendanceRecord.findMany({
    where: { date: new Date(selectedDate), employeeId: { in: employees.map((e) => e.id) } },
  });
  const statusByEmployee = new Map(existingRecords.map((r) => [r.employeeId, r.status]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Mark daily attendance for all employees.</p>
      </div>
      <AttendanceEditor
        date={selectedDate}
        employees={employees.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          status: statusByEmployee.get(e.id) ?? "PRESENT",
        }))}
      />
    </div>
  );
}
