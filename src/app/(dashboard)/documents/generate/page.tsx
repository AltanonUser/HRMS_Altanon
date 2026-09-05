import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { currentFinancialYear } from "@/lib/utils/dates";
import { GenerateDocumentForm } from "./generate-form";

export default async function GenerateDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; candidateId?: string; employeeId?: string }>;
}) {
  await requirePermission(PERMISSIONS.DOCUMENT_GENERATE);
  const { type, candidateId, employeeId } = await searchParams;

  const [candidates, employees, company, statutoryConfig] = await Promise.all([
    prisma.candidate.findMany({
      where: { status: { notIn: ["REJECTED", "HIRED"] } },
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { employmentStatus: { not: "TERMINATED" } },
      include: { designation: true, department: true, reportingManager: { select: { firstName: true, lastName: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.companyProfile.findFirst(),
    prisma.statutoryConfig.findUnique({ where: { financialYear: currentFinancialYear() } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Generate Document</h1>
        <p className="text-sm text-muted-foreground">Creates a branded PDF you can preview, download, and send by email.</p>
      </div>
      <GenerateDocumentForm
        candidates={candidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          positionTitle: c.positionTitle,
          departmentName: c.department?.name ?? null,
          offeredCtc: c.offeredCtc ? Number(c.offeredCtc) : null,
          proposedJoiningDate: c.proposedJoiningDate ? c.proposedJoiningDate.toISOString().slice(0, 10) : null,
        }))}
        employees={employees.map((e) => ({
          id: e.id,
          fullName: `${e.firstName} ${e.lastName}`,
          officialEmail: e.officialEmail,
          personalEmail: e.personalEmail,
          employeeCode: e.employeeCode,
          designationTitle: e.designation.title,
          departmentName: e.department.name,
          dateOfJoining: e.dateOfJoining.toISOString().slice(0, 10),
          dateOfLeaving: e.dateOfLeaving ? e.dateOfLeaving.toISOString().slice(0, 10) : null,
          reportingManagerName: e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}` : null,
        }))}
        companyDefaults={{
          hrName: company?.signatoryName ?? "",
          hrTitle: company?.signatoryTitle ?? "",
          workLocation: "Pune, Maharashtra",
        }}
        pfConfig={
          statutoryConfig
            ? { employerRate: Number(statutoryConfig.pfEmployerRate), wageCeiling: Number(statutoryConfig.pfWageCeiling) }
            : null
        }
        initialType={type}
        initialCandidateId={candidateId}
        initialEmployeeId={employeeId}
      />
    </div>
  );
}
