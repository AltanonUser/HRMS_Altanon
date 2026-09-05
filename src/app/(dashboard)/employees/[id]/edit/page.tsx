import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { EmployeeForm } from "../../employee-form";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.EMPLOYEE_UPDATE);
  const { id } = await params;

  const [employee, departments, designations, managers] = await Promise.all([
    prisma.employee.findUnique({ where: { id } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
    prisma.employee.findMany({ where: { employmentStatus: "ACTIVE" }, orderBy: { firstName: "asc" } }),
  ]);

  if (!employee) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit {employee.firstName} {employee.lastName}</h1>
      </div>
      <EmployeeForm
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title }))}
        managers={managers.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        editing={{
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          personalEmail: employee.personalEmail ?? "",
          officialEmail: employee.officialEmail ?? "",
          phone: employee.phone ?? "",
          dob: employee.dob ? employee.dob.toISOString().slice(0, 10) : "",
          address: employee.address ?? "",
          bankName: employee.bankName ?? "",
          departmentId: employee.departmentId,
          designationId: employee.designationId,
          reportingManagerId: employee.reportingManagerId,
          dateOfJoining: employee.dateOfJoining.toISOString().slice(0, 10),
          employmentType: employee.employmentType,
        }}
      />
    </div>
  );
}
