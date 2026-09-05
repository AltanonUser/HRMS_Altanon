import Link from "next/link";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { listVisibleEmployees } from "@/server/services/employeeService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { formatDateIN } from "@/lib/utils/dates";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_NOTICE: "secondary",
  RELIEVED: "outline",
  TERMINATED: "destructive",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { q, scope } = await searchParams;

  const canViewAll = hasPermission(session, PERMISSIONS.EMPLOYEE_VIEW_ALL);
  const canCreate = hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE);

  const employees = await listVisibleEmployees(session, scope === "team" ? "team" : undefined);
  const filtered = q
    ? employees.filter((e) =>
        `${e.firstName} ${e.lastName} ${e.employeeCode} ${e.officialEmail ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : employees;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{scope === "team" ? "My Team" : "Employees"}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {employees.length} shown</p>
        </div>
        {canCreate && (
          <Button render={<Link href="/employees/new" />} nativeButton={false} size="sm">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>

      <form className="max-w-sm">
        <Input name="q" placeholder="Search by name, code, or email" defaultValue={q ?? ""} />
      </form>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Reports To</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/employees/${e.id}`} className="font-medium hover:underline">
                    {e.firstName} {e.lastName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{e.employeeCode}</div>
                </TableCell>
                <TableCell>{e.designation.title}</TableCell>
                <TableCell>{e.department.name}</TableCell>
                <TableCell>{e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}` : "—"}</TableCell>
                <TableCell>{formatDateIN(e.dateOfJoining)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[e.employmentStatus] ?? "outline"}>{e.employmentStatus.replace("_", " ")}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!canViewAll && <p className="text-xs text-muted-foreground">Showing only employees visible to your role.</p>}
    </div>
  );
}
