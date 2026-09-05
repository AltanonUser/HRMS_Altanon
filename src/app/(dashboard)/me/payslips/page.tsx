import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/currency";
import { Download } from "lucide-react";

export default async function MyPayslipsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.employeeId) return <p className="text-sm text-muted-foreground">No employee profile linked.</p>;

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: session.employeeId },
    include: { run: true },
    orderBy: [{ run: { year: "desc" } }, { run: { month: "desc" } }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My Payslips</h1>
        <p className="text-sm text-muted-foreground">Download your monthly payslips.</p>
      </div>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead className="text-right">Payslip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payslips yet.</TableCell></TableRow>
            )}
            {payslips.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{MONTH_NAMES[p.run.month - 1]} {p.run.year}</TableCell>
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
