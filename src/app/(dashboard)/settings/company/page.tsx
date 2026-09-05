import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { CompanyForm } from "./company-form";

export default async function CompanySettingsPage() {
  await requirePermission(PERMISSIONS.COMPANY_SETTINGS_MANAGE);
  const profile = await prisma.companyProfile.findFirst();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">Used on letterheads, payslips, and generated documents.</p>
      </div>
      <CompanyForm
        initial={{
          legalName: profile?.legalName ?? "",
          displayName: profile?.displayName ?? "",
          cin: profile?.cin ?? "",
          registeredAddress: profile?.registeredAddress ?? "",
          website: profile?.website ?? "",
          officialEmail: profile?.officialEmail ?? "",
          phone: profile?.phone ?? "",
          signatoryName: profile?.signatoryName ?? "",
          signatoryTitle: profile?.signatoryTitle ?? "",
        }}
      />
    </div>
  );
}
