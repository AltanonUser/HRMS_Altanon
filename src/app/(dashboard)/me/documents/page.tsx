import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LETTER_TYPE_LABELS } from "@/lib/documents/fieldConfig";
import { formatDateIN } from "@/lib/utils/dates";
import { Download } from "lucide-react";

export default async function MyDocumentsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.employeeId) return <p className="text-sm text-muted-foreground">No employee profile linked.</p>;

  const docs = await prisma.generatedDocument.findMany({
    where: { employeeId: session.employeeId },
    orderBy: { generatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My Documents</h1>
        <p className="text-sm text-muted-foreground">Letters issued to you.</p>
      </div>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No documents yet.</TableCell></TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{LETTER_TYPE_LABELS[d.type]}</TableCell>
                <TableCell>{formatDateIN(d.generatedAt)}</TableCell>
                <TableCell className="text-right">
                  {d.pdfPath && (
                    <Button variant="ghost" size="sm" render={<a href={`/api/documents/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
