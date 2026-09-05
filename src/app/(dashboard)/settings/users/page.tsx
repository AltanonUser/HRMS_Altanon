import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserDialog } from "./create-user-dialog";
import { UserRowActions } from "./user-row-actions";
import { formatDateIN } from "@/lib/utils/dates";

export default async function UsersPage() {
  await requirePermission(PERMISSIONS.USER_VIEW);
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const [users, roles, employeesWithoutLogin] = await Promise.all([
    prisma.user.findMany({
      include: { role: true, employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { label: "asc" } }),
    prisma.employee.findMany({
      where: { user: null, employmentStatus: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage login accounts and role assignment.</p>
        </div>
        <CreateUserDialog
          roles={roles.map((r) => ({ id: r.id, label: r.label }))}
          employeesWithoutLogin={employeesWithoutLogin.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : "—"}</TableCell>
                <TableCell>{u.lastLoginAt ? formatDateIN(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserRowActions
                    userId={u.id}
                    currentRoleId={u.roleId}
                    roles={roles.map((r) => ({ id: r.id, label: r.label }))}
                    isActive={u.isActive}
                    isSelf={u.id === session.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
