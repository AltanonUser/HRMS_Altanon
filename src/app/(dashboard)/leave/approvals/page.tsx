import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DecisionButtons } from "./decision-buttons";
import { formatDateIN } from "@/lib/utils/dates";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export default async function LeaveApprovalsPage() {
  await requirePermission(PERMISSIONS.LEAVE_APPROVE_TEAM);
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const requests = await prisma.leaveRequest.findMany({
    where: { approverId: session.employeeId ?? "__none__" },
    include: { employee: { select: { firstName: true, lastName: true } }, leaveType: { select: { label: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Leave Approvals</h1>
        <p className="text-sm text-muted-foreground">Requests from employees who report to you.</p>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No leave requests.</TableCell></TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employee.firstName} {r.employee.lastName}</TableCell>
                <TableCell>{r.leaveType.label}</TableCell>
                <TableCell>{formatDateIN(r.startDate)} – {formatDateIN(r.endDate)}</TableCell>
                <TableCell>{r.days.toString()}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">{r.status === "PENDING" && <DecisionButtons requestId={r.id} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
