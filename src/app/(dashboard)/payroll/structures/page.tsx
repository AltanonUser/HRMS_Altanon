import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { StructureForm } from "./structure-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils/currency";
import { formatDateIN } from "@/lib/utils/dates";

export default async function SalaryStructuresPage() {
  await requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);

  const [employees, componentTypes, structures] = await Promise.all([
    prisma.employee.findMany({ where: { employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] } }, orderBy: { firstName: "asc" } }),
    prisma.salaryComponentType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.salaryStructure.findMany({
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Salary Structures</h1>
        <p className="text-sm text-muted-foreground">A raise creates a new versioned structure — history is preserved, not overwritten.</p>
      </div>

      <StructureForm
        employees={employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` }))}
        componentTypes={componentTypes.map((c) => ({ id: c.id, code: c.code, label: c.label, category: c.category }))}
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Annual CTC</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.employee.firstName} {s.employee.lastName} <span className="text-muted-foreground">({s.employee.employeeCode})</span></TableCell>
                <TableCell>{formatINR(s.ctcAnnual.toString())}</TableCell>
                <TableCell>{formatDateIN(s.effectiveFrom)}</TableCell>
                <TableCell><Badge variant={s.status === "ACTIVE" ? "default" : "outline"}>{s.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
