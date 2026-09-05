import "server-only";
import { getCurrentSession, hasPermission, hasAnyPermission, type SessionUser } from "@/lib/auth/session";
import type { PermissionCode } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/db/prisma";

export class AuthenticationError extends Error {
  constructor(message = "You must be signed in to do this.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do this.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Loads the current session or throws. Use at the top of every Server Action / Route Handler. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) throw new AuthenticationError();
  return session;
}

/** Requires the current user to hold `code`, or throws AuthorizationError. Returns the session for convenience. */
export async function requirePermission(code: PermissionCode): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasPermission(session, code)) throw new AuthorizationError();
  return session;
}

/** Requires the current user to hold at least one of `codes`. */
export async function requireAnyPermission(codes: PermissionCode[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasAnyPermission(session, codes)) throw new AuthorizationError();
  return session;
}

/**
 * Returns the ids of every employee visible to this user for "team"-scoped views:
 * themselves plus every employee in their reporting chain (direct + indirect reports).
 * Small dataset (single company) — fetch once and walk in memory rather than a recursive SQL query.
 */
export async function getVisibleEmployeeIds(session: SessionUser): Promise<string[]> {
  if (!session.employeeId) return [];
  const all = await prisma.employee.findMany({
    select: { id: true, reportingManagerId: true },
  });
  const byManager = new Map<string, string[]>();
  for (const e of all) {
    if (!e.reportingManagerId) continue;
    const list = byManager.get(e.reportingManagerId) ?? [];
    list.push(e.id);
    byManager.set(e.reportingManagerId, list);
  }
  const visible = new Set<string>([session.employeeId]);
  const queue = [session.employeeId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const reportId of byManager.get(current) ?? []) {
      if (!visible.has(reportId)) {
        visible.add(reportId);
        queue.push(reportId);
      }
    }
  }
  return Array.from(visible);
}
