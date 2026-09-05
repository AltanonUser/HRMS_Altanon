import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplyLeaveDialog } from "./apply-leave-dialog";
import { formatDateIN } from "@/lib/utils/dates";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export default async function MyLeavePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.employeeId) return <p className="text-sm text-muted-foreground">No employee profile linked.</p>;

  const currentYear = new Date().getFullYear();
  const [leaveTypes, requests, balances] = await Promise.all([
    prisma.leaveType.findMany({ orderBy: { label: "asc" } }),
    prisma.leaveRequest.findMany({
      where: { employeeId: session.employeeId },
      include: { leaveType: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveBalance.findMany({ where: { employeeId: session.employeeId, year: currentYear }, include: { leaveType: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Leave</h1>
          <p className="text-sm text-muted-foreground">Apply for leave and track your requests.</p>
        </div>
        <ApplyLeaveDialog leaveTypes={leaveTypes.map((l) => ({ id: l.id, label: l.label }))} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {leaveTypes.map((lt) => {
          const balance = balances.find((b) => b.leaveTypeId === lt.id);
          const available = balance ? Number(balance.opening) + Number(balance.accrued) - Number(balance.used) : 0;
          return (
            <Card key={lt.id}>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">{lt.label}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{available}</p><p className="text-xs text-muted-foreground">days available</p></CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No leave requests yet.</TableCell></TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.leaveType.label}</TableCell>
                <TableCell>{formatDateIN(r.startDate)} – {formatDateIN(r.endDate)}</TableCell>
                <TableCell>{r.days.toString()}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
