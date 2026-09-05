"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { statutoryConfigSchema, type StatutoryConfigInput } from "@/lib/validation/statutory.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function updateStatutoryConfig(input: StatutoryConfigInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.STATUTORY_CONFIG_MANAGE);
    const parsed = statutoryConfigSchema.parse(input);

    await prisma.statutoryConfig.update({
      where: { financialYear: parsed.financialYear },
      data: {
        pfEmployeeRate: parsed.pfEmployeeRate,
        pfEmployerRate: parsed.pfEmployerRate,
        pfWageCeiling: parsed.pfWageCeiling,
        standardDeduction: parsed.standardDeduction,
        defaultRegime: parsed.defaultRegime,
        notes: parsed.notes || null,
      },
    });

    await logAudit({ actorUserId: session.id, action: "UPDATE", entityType: "StatutoryConfig", entityId: parsed.financialYear });
    revalidatePath("/payroll/statutory");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
