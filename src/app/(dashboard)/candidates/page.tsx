import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateCandidateDialog } from "./create-candidate-dialog";
import { formatINR } from "@/lib/utils/currency";
import { formatDateIN } from "@/lib/utils/dates";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  IN_PROCESS: "secondary",
  OFFER_SENT: "default",
  OFFER_ACCEPTED: "default",
  OFFER_DECLINED: "destructive",
  HIRED: "default",
  REJECTED: "destructive",
};

export default async function CandidatesPage() {
  await requirePermission(PERMISSIONS.CANDIDATE_VIEW);

  const [candidates, departments] = await Promise.all([
    prisma.candidate.findMany({ include: { department: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Candidates</h1>
          <p className="text-sm text-muted-foreground">Track candidates through offer generation and onboarding.</p>
        </div>
        <CreateCandidateDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Offered CTC</TableHead>
              <TableHead>Joining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No candidates yet.</TableCell></TableRow>
            )}
            {candidates.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </TableCell>
                <TableCell>{c.positionTitle}</TableCell>
                <TableCell>{c.department?.name ?? "—"}</TableCell>
                <TableCell>{c.offeredCtc ? formatINR(c.offeredCtc.toString()) : "—"}</TableCell>
                <TableCell>{c.proposedJoiningDate ? formatDateIN(c.proposedJoiningDate) : "—"}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">
                  <Link href={`/documents/generate?type=OFFER_LETTER&candidateId=${c.id}`} className="text-sm text-primary hover:underline">
                    Generate Offer Letter
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
