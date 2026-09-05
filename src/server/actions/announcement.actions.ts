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

export async function createAnnouncement(title: string, body: string, isPinned: boolean): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE);
    if (!title.trim() || !body.trim()) return { success: false, error: "Title and body are required." };

    const announcement = await prisma.announcement.create({
      data: { title: title.trim(), body: body.trim(), isPinned, createdById: session.id },
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Announcement", entityId: announcement.id });
    revalidatePath("/announcements");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE);
    await prisma.announcement.delete({ where: { id } });
    await logAudit({ actorUserId: session.id, action: "DELETE", entityType: "Announcement", entityId: id });
    revalidatePath("/announcements");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
