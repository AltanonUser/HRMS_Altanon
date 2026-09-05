import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage() {
  await requirePermission(PERMISSIONS.EMPLOYEE_CREATE);

  const [departments, designations, managers] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
    prisma.employee.findMany({ where: { employmentStatus: "ACTIVE" }, orderBy: { firstName: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Employee</h1>
        <p className="text-sm text-muted-foreground">Creates a new employee record. Create a login for them separately under Users.</p>
      </div>
      <EmployeeForm
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title }))}
        managers={managers.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
      />
    </div>
  );
}
