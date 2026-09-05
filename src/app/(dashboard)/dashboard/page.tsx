import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateIN } from "@/lib/utils/dates";
import Link from "next/link";
import { Users, Building2, UserPlus, CalendarClock } from "lucide-react";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const canViewAllEmployees = hasPermission(session, PERMISSIONS.EMPLOYEE_VIEW_ALL);
  const canViewCandidates = hasPermission(session, PERMISSIONS.CANDIDATE_VIEW);
  const canApproveLeave = hasPermission(session, PERMISSIONS.LEAVE_APPROVE_TEAM);

  const [activeEmployees, departmentCount, openCandidates, upcomingJoiners, pendingLeave, announcements] =
    await Promise.all([
      canViewAllEmployees ? prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }) : null,
      canViewAllEmployees ? prisma.department.count({ where: { isActive: true } }) : null,
      canViewCandidates
        ? prisma.candidate.count({ where: { status: { in: ["IN_PROCESS", "OFFER_SENT"] } } })
        : null,
      canViewAllEmployees
        ? prisma.employee.findMany({
            where: { dateOfJoining: { gte: new Date() } },
            orderBy: { dateOfJoining: "asc" },
            take: 5,
            select: { id: true, firstName: true, lastName: true, dateOfJoining: true, designation: { select: { title: true } } },
          })
        : [],
      canApproveLeave ? prisma.leaveRequest.count({ where: { status: "PENDING" } }) : null,
      prisma.announcement.findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 5 }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.employeeFullName ?? session.email}</h1>
        <p className="text-sm text-muted-foreground">{session.role.label} · Altanon AI Works Pvt Ltd</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {canViewAllEmployees && (
          <StatCard icon={<Users className="h-4 w-4" />} label="Active Employees" value={activeEmployees ?? 0} href="/employees" />
        )}
        {canViewAllEmployees && (
          <StatCard icon={<Building2 className="h-4 w-4" />} label="Departments" value={departmentCount ?? 0} href="/departments" />
        )}
        {canViewCandidates && (
          <StatCard icon={<UserPlus className="h-4 w-4" />} label="Candidates in Process" value={openCandidates ?? 0} href="/candidates" />
        )}
        {canApproveLeave && (
          <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Pending Leave Approvals" value={pendingLeave ?? 0} href="/leave/approvals" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canViewAllEmployees && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Joiners</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingJoiners.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming joiners.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {upcomingJoiners.map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-sm">
                      <span>
                        {e.firstName} {e.lastName} <span className="text-muted-foreground">— {e.designation.title}</span>
                      </span>
                      <span className="text-muted-foreground">{formatDateIN(e.dateOfJoining)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
