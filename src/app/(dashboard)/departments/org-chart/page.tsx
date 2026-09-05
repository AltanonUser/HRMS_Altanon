import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Card, CardContent } from "@/components/ui/card";

type EmpNode = {
  id: string;
  name: string;
  designation: string;
  department: string;
  children: EmpNode[];
};

export default async function OrgChartPage() {
  await requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL);

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: { not: "TERMINATED" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      reportingManagerId: true,
      designation: { select: { title: true } },
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const nodeById = new Map<string, EmpNode>();
  for (const e of employees) {
    nodeById.set(e.id, {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      designation: e.designation.title,
      department: e.department.name,
      children: [],
    });
  }
  const roots: EmpNode[] = [];
  for (const e of employees) {
    const node = nodeById.get(e.id)!;
    if (e.reportingManagerId && nodeById.has(e.reportingManagerId)) {
      nodeById.get(e.reportingManagerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Org Chart</h1>
        <p className="text-sm text-muted-foreground">Reporting hierarchy across the company.</p>
      </div>
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees yet.</p>
      ) : (
        <div className="flex flex-col gap-8 overflow-x-auto pb-4">
          {roots.map((r) => (
            <OrgNode key={r.id} node={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgNode({ node }: { node: EmpNode }) {
  return (
    <div className="flex flex-col items-center">
      <Card className="w-56 shrink-0">
        <CardContent className="pt-4 text-center">
          <p className="text-sm font-semibold">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.designation}</p>
          <p className="text-xs text-muted-foreground">{node.department}</p>
        </CardContent>
      </Card>
      {node.children.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex gap-8 border-t pt-6">
            {node.children.map((child) => (
              <OrgNode key={child.id} node={child} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
