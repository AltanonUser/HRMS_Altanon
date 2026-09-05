import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { GenerateForm16Form } from "./generate-form16-form";
import { UploadPartADialog } from "./upload-part-a-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils/currency";
import { Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PART_B_GENERATED: "secondary",
  PART_A_ATTACHED: "secondary",
  FINALIZED: "default",
};

export default async function Form16Page() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const canGenerate = hasPermission(session, PERMISSIONS.FORM16_GENERATE);
  const canViewAll = hasPermission(session, PERMISSIONS.FORM16_VIEW_ALL);

  const [records, employees] = await Promise.all([
    prisma.form16Record.findMany({
      where: canViewAll ? {} : { employeeId: session.employeeId ?? "__none__" },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ financialYear: "desc" }],
    }),
    canGenerate
      ? prisma.employee.findMany({ where: { employmentStatus: { in: ["ACTIVE", "ON_NOTICE", "RELIEVED"] } }, orderBy: { firstName: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Form 16</h1>
        <p className="text-sm text-muted-foreground">Salary computation (Part B) plus genuine TRACES Part A when available.</p>
      </div>

      <Alert>
        <AlertDescription>
          Part A can only come from the government TRACES portal after quarterly TDS returns are filed. This app
          generates Part B and lets you attach the real Part A once you have it.
        </AlertDescription>
      </Alert>

      {canGenerate && (
        <GenerateForm16Form employees={employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` }))} />
      )}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>TDS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No Form 16 records yet.</TableCell></TableRow>
            )}
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employee.firstName} {r.employee.lastName} <span className="text-muted-foreground">({r.employee.employeeCode})</span></TableCell>
                <TableCell>{r.financialYear}</TableCell>
                <TableCell>{formatINR(r.grossSalary.toString())}</TableCell>
                <TableCell>{formatINR(r.totalTdsDeducted.toString())}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {(r.partBPdfPath || r.mergedPdfPath) && (
                      <Button variant="ghost" size="sm" render={<a href={`/api/form16/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {canGenerate && !r.mergedPdfPath && <UploadPartADialog recordId={r.id} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
