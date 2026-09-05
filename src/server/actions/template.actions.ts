"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function updateTemplateBody(templateId: string, htmlBody: string): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DOCUMENT_TEMPLATE_MANAGE);
    if (!htmlBody.trim()) return { success: false, error: "Template body cannot be empty." };

    const current = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
    if (!current) return { success: false, error: "Template not found." };

    const updated = await prisma.documentTemplate.update({
      where: { id: templateId },
      data: { htmlBody, version: current.version + 1 },
    });

    await logAudit({ actorUserId: session.id, action: "UPDATE", entityType: "DocumentTemplate", entityId: templateId, after: { version: updated.version } });
    revalidatePath("/documents/templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
