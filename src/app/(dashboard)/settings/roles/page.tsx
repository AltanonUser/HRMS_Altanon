import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { RolePermissionsEditor } from "./role-permissions-editor";
import { CreateRoleDialog } from "./create-role-dialog";

export default async function RolesPage() {
  await requirePermission(PERMISSIONS.ROLE_MANAGE);

  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { label: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Control what each role can see and do. Changes apply immediately — no need for users to log out.
          </p>
        </div>
        <CreateRoleDialog />
      </div>

      <div className="flex flex-col gap-4">
        {roles.map((role) => (
          <RolePermissionsEditor
            key={role.id}
            roleId={role.id}
            roleLabel={role.label}
            isSystemRole={role.isSystemRole}
            initialCodes={role.permissions.map((rp) => rp.permission.code)}
          />
        ))}
      </div>
    </div>
  );
}
