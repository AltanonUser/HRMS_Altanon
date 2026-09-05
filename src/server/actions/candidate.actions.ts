"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { candidateSchema, type CandidateInput } from "@/lib/validation/candidate.schema";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function createCandidate(input: CandidateInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.CANDIDATE_CREATE);
    const parsed = candidateSchema.parse(input);

    const candidate = await prisma.candidate.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email.trim().toLowerCase(),
        phone: parsed.phone || null,
        positionTitle: parsed.positionTitle,
        departmentId: parsed.departmentId || null,
        offeredCtc: parsed.offeredCtc ?? null,
        proposedJoiningDate: parsed.proposedJoiningDate ? new Date(parsed.proposedJoiningDate) : null,
        createdById: session.id,
      },
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "Candidate", entityId: candidate.id });
    revalidatePath("/candidates");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function updateCandidateStatus(candidateId: string, status: string): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.CANDIDATE_UPDATE);
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: status as never },
    });
    await logAudit({ actorUserId: session.id, action: "UPDATE_STATUS", entityType: "Candidate", entityId: candidateId, after: { status: candidate.status } });
    revalidatePath("/candidates");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
