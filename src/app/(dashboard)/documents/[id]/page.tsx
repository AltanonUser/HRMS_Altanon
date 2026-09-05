import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { LETTER_TYPE_LABELS } from "@/lib/documents/fieldConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendDocumentDialog } from "../send-document-dialog";
import { formatDateIN } from "@/lib/utils/dates";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  GENERATED: "secondary",
  SENT: "default",
  FAILED: "destructive",
};

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, officialEmail: true, personalEmail: true } },
      candidate: { select: { id: true, fullName: true, email: true } },
      emailLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!doc) notFound();

  const canViewAll = hasPermission(session, PERMISSIONS.DOCUMENT_VIEW_ALL);
  const isOwn = doc.employeeId && doc.employeeId === session.employeeId;
  if (!canViewAll && !isOwn) redirect("/documents");

  const canSend = hasPermission(session, PERMISSIONS.DOCUMENT_SEND);
  const recipientName = doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : doc.candidate?.fullName;
  const recipientEmail = doc.employee?.officialEmail || doc.employee?.personalEmail || doc.candidate?.email || "";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{LETTER_TYPE_LABELS[doc.type]}</h1>
          <p className="text-sm text-muted-foreground">For {recipientName} · Generated {formatDateIN(doc.generatedAt)}</p>
          <Badge className="mt-2" variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
        </div>
        {canSend && doc.pdfPath && (
          <SendDocumentDialog
            documentId={doc.id}
            defaultTo={recipientEmail}
            defaultSubject={`${LETTER_TYPE_LABELS[doc.type]} — Altanon AI Works Pvt Ltd`}
            defaultMessage={`Dear ${recipientName},\n\nPlease find attached your ${LETTER_TYPE_LABELS[doc.type].toLowerCase()}.\n\nRegards,\nAltanon AI Works Pvt Ltd`}
          />
        )}
      </div>

      {doc.pdfPath && (
        <Card>
          <CardContent className="pt-6">
            <iframe src={`/api/documents/${doc.id}/pdf`} className="h-[70vh] w-full rounded-md border" />
          </CardContent>
        </Card>
      )}

      {doc.emailLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Send History</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {doc.emailLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span>{log.toEmail} — {log.subject}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === "SENT" ? "default" : log.status === "FAILED" ? "destructive" : "secondary"}>{log.status}</Badge>
                  <span className="text-xs text-muted-foreground">{log.sentAt ? formatDateIN(log.sentAt) : formatDateIN(log.createdAt)}</span>
                </div>
              </div>
            ))}
            {doc.emailLogs.some((l) => l.status === "FAILED") && (
              <p className="text-xs text-destructive">
                {doc.emailLogs.find((l) => l.status === "FAILED")?.errorMessage}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
