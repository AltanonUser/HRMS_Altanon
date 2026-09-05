import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateIN } from "@/lib/utils/dates";

export default async function AuditLogPage() {
  await requirePermission(PERMISSIONS.AUDIT_LOG_VIEW);

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const actorIds = Array.from(new Set(logs.map((l) => l.actorUserId).filter((id): id is string => Boolean(id))));
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } });
  const actorEmailById = new Map(actors.map((a) => [a.id, a.email]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Recent actions across the system (last 200 events).</p>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No activity recorded yet.</TableCell></TableRow>
            )}
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateIN(l.createdAt)}</TableCell>
                <TableCell className="text-sm">{l.actorUserId ? actorEmailById.get(l.actorUserId) ?? "Unknown" : "System"}</TableCell>
                <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.entityType} · {l.entityId.slice(0, 10)}…</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
