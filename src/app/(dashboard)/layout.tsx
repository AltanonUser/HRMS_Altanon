import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { PermissionCode } from "@/lib/rbac/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/account/change-password");

  const permissionCodes = Array.from(session.permissions) as PermissionCode[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar permissionCodes={permissionCodes} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          name={session.employeeFullName ?? session.email}
          email={session.email}
          roleLabel={session.role.label}
          permissionCodes={permissionCodes}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
