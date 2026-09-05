import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/currency";
import { Download } from "lucide-react";

export default async function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.PAYROLL_RUN_EXECUTE);
  const { id } = await params;

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!run) notFound();

  const totals = run.payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + Number(p.grossEarnings),
      deductions: acc.deductions + Number(p.totalDeductions),
      net: acc.net + Number(p.netPay),
    }),
    { gross: 0, deductions: 0, net: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{MONTH_NAMES[run.month - 1]} {run.year}</h1>
          <Badge className="mt-1" variant={run.status === "FINALIZED" ? "default" : "secondary"}>{run.status}</Badge>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Gross: {formatINR(totals.gross)}</p>
          <p>Deductions: {formatINR(totals.deductions)}</p>
          <p className="font-medium text-foreground">Net Payout: {formatINR(totals.net)}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead className="text-right">Payslip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.payslips.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.employee.firstName} {p.employee.lastName} <span className="text-muted-foreground">({p.employee.employeeCode})</span></TableCell>
                <TableCell>{formatINR(p.grossEarnings.toString())}</TableCell>
                <TableCell>{formatINR(p.totalDeductions.toString())}</TableCell>
                <TableCell className="font-medium">{formatINR(p.netPay.toString())}</TableCell>
                <TableCell className="text-right">
                  {p.pdfPath && (
                    <Button variant="ghost" size="sm" render={<a href={`/api/payslips/${p.id}/pdf`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
