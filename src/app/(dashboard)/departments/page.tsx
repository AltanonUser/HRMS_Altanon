import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepartmentFormDialog } from "./department-form-dialog";
import { DesignationFormDialog } from "./designation-form-dialog";
import Link from "next/link";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeptNode = {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  employeeCount: number;
  children: DeptNode[];
};

export default async function DepartmentsPage() {
  await requirePermission(PERMISSIONS.DEPARTMENT_MANAGE);

  const [departments, designations] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.designation.findMany({ where: { isActive: true }, orderBy: [{ grade: "desc" }, { title: "asc" }] }),
  ]);

  const nodeById = new Map<string, DeptNode>();
  for (const d of departments) {
    nodeById.set(d.id, {
      id: d.id,
      name: d.name,
      code: d.code,
      parentDepartmentId: d.parentDepartmentId,
      employeeCount: d._count.employees,
      children: [],
    });
  }
  const roots: DeptNode[] = [];
  for (const node of nodeById.values()) {
    if (node.parentDepartmentId && nodeById.has(node.parentDepartmentId)) {
      nodeById.get(node.parentDepartmentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Company Hierarchy</h1>
          <p className="text-sm text-muted-foreground">Departments, sub-departments, and designations.</p>
        </div>
        <Button render={<Link href="/departments/org-chart" />} nativeButton={false} variant="outline" size="sm">
          <Network className="h-4 w-4" /> View Org Chart
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Departments</CardTitle>
            <DepartmentFormDialog departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
          </CardHeader>
          <CardContent>
            {roots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments yet.</p>
            ) : (
              <DeptTree nodes={roots} depth={0} allDepartments={departments.map((d) => ({ id: d.id, name: d.name }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Designations</CardTitle>
            <DesignationFormDialog />
          </CardHeader>
          <CardContent>
            {designations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No designations yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {designations.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span>{d.title}</span>
                    {d.grade !== null && <Badge variant="secondary">Grade {d.grade}</Badge>}
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

function DeptTree({
  nodes,
  depth,
  allDepartments,
}: {
  nodes: DeptNode[];
  depth: number;
  allDepartments: { id: string; name: string }[];
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50" style={{ paddingLeft: depth * 20 + 8 }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{node.name}</span>
              <Badge variant="outline" className="text-xs">{node.code}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{node.employeeCount} employee{node.employeeCount === 1 ? "" : "s"}</span>
          </div>
          {node.children.length > 0 && <DeptTree nodes={node.children} depth={depth + 1} allDepartments={allDepartments} />}
        </li>
      ))}
    </ul>
  );
}
