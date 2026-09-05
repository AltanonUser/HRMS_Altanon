import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { StatutoryForm } from "./statutory-form";

export default async function StatutoryConfigPage() {
  await requirePermission(PERMISSIONS.STATUTORY_CONFIG_MANAGE);
  const configs = await prisma.statutoryConfig.findMany({ orderBy: { financialYear: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Statutory Configuration</h1>
        <p className="text-sm text-muted-foreground">PF, Professional Tax, and TDS settings used by the payroll engine, per financial year.</p>
      </div>
      {configs.map((c) => (
        <StatutoryForm
          key={c.id}
          initial={{
            financialYear: c.financialYear,
            pfEmployeeRate: Number(c.pfEmployeeRate),
            pfEmployerRate: Number(c.pfEmployerRate),
            pfWageCeiling: Number(c.pfWageCeiling),
            standardDeduction: Number(c.standardDeduction),
            defaultRegime: c.defaultRegime,
            notes: c.notes ?? "",
          }}
        />
      ))}
    </div>
  );
}
