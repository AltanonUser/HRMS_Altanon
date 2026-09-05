"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/validation/company.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function updateCompanyProfile(input: CompanyProfileInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.COMPANY_SETTINGS_MANAGE);
    const parsed = companyProfileSchema.parse(input);

    const existing = await prisma.companyProfile.findFirst();
    const profile = existing
      ? await prisma.companyProfile.update({
          where: { id: existing.id },
          data: {
            legalName: parsed.legalName,
            displayName: parsed.displayName,
            cin: parsed.cin || null,
            registeredAddress: parsed.registeredAddress,
            website: parsed.website || null,
            officialEmail: parsed.officialEmail || null,
            phone: parsed.phone || null,
            signatoryName: parsed.signatoryName || null,
            signatoryTitle: parsed.signatoryTitle || null,
          },
        })
      : await prisma.companyProfile.create({
          data: {
            legalName: parsed.legalName,
            displayName: parsed.displayName,
            cin: parsed.cin || null,
            registeredAddress: parsed.registeredAddress,
            website: parsed.website || null,
            officialEmail: parsed.officialEmail || null,
            phone: parsed.phone || null,
            signatoryName: parsed.signatoryName || null,
            signatoryTitle: parsed.signatoryTitle || null,
          },
        });

    await logAudit({ actorUserId: session.id, action: "UPDATE", entityType: "CompanyProfile", entityId: profile.id });
    revalidatePath("/settings/company");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
