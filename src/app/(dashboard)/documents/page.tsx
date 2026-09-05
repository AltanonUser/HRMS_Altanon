import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LETTER_TYPE_LABELS } from "@/lib/documents/fieldConfig";
import { formatDateIN } from "@/lib/utils/dates";
import { FilePlus } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  GENERATED: "secondary",
  SENT: "default",
  FAILED: "destructive",
};

export default async function DocumentsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const canViewAll = hasPermission(session, PERMISSIONS.DOCUMENT_VIEW_ALL);
  const canGenerate = hasPermission(session, PERMISSIONS.DOCUMENT_GENERATE);

  const docs = await prisma.generatedDocument.findMany({
    where: canViewAll ? {} : { employeeId: session.employeeId ?? "__none__" },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      candidate: { select: { fullName: true } },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">All generated offer, internship, relieving, experience, and appointment letters.</p>
        </div>
        {canGenerate && (
          <Button render={<Link href="/documents/generate" />} nativeButton={false} size="sm">
            <FilePlus className="h-4 w-4" /> Generate Document
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No documents yet.</TableCell></TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link href={`/documents/${d.id}`} className="font-medium hover:underline">{LETTER_TYPE_LABELS[d.type]}</Link>
                </TableCell>
                <TableCell>{d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : d.candidate?.fullName ?? "—"}</TableCell>
                <TableCell>{formatDateIN(d.generatedAt)}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
