import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { RunPayrollForm } from "./run-payroll-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MONTH_NAMES } from "@/lib/utils/dates";

export default async function PayrollRunsPage() {
  await requirePermission(PERMISSIONS.PAYROLL_RUN_EXECUTE);

  const runs = await prisma.payrollRun.findMany({
    include: { _count: { select: { payslips: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payroll Runs</h1>
        <p className="text-sm text-muted-foreground">Run monthly payroll for all employees with an active salary structure.</p>
      </div>

      <RunPayrollForm />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Employees Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No payroll runs yet.</TableCell></TableRow>
            )}
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/payroll/runs/${r.id}`} className="font-medium hover:underline">{MONTH_NAMES[r.month - 1]} {r.year}</Link>
                </TableCell>
                <TableCell>{r._count.payslips}</TableCell>
                <TableCell><Badge variant={r.status === "FINALIZED" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
