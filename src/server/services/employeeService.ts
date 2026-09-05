import "server-only";
import { prisma } from "@/lib/db/prisma";
import { hasPermission, type SessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getVisibleEmployeeIds } from "@/lib/rbac/guard";

/** Returns the employee list this user is allowed to see: all, their team (reporting chain), or just themselves. */
export async function listVisibleEmployees(session: SessionUser, scope?: "team") {
  const canViewAll = hasPermission(session, PERMISSIONS.EMPLOYEE_VIEW_ALL);
  const canViewTeam = hasPermission(session, PERMISSIONS.EMPLOYEE_VIEW_TEAM);

  let where = {};
  if (canViewAll && scope !== "team") {
    where = {};
  } else if (canViewTeam || (canViewAll && scope === "team")) {
    const ids = await getVisibleEmployeeIds(session);
    where = { id: { in: ids } };
  } else if (session.employeeId) {
    where = { id: session.employeeId };
  } else {
    where = { id: "__none__" };
  }

  return prisma.employee.findMany({
    where,
    include: {
      department: { select: { name: true } },
      designation: { select: { title: true } },
      reportingManager: { select: { firstName: true, lastName: true } },
    },
    orderBy: { firstName: "asc" },
  });
}
