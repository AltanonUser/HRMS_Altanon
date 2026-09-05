import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { LETTER_TYPE_LABELS } from "@/lib/documents/fieldConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditTemplateDialog } from "./edit-template-dialog";

export default async function DocumentTemplatesPage() {
  await requirePermission(PERMISSIONS.DOCUMENT_TEMPLATE_MANAGE);
  const templates = await prisma.documentTemplate.findMany({ where: { isActive: true }, orderBy: { type: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Document Templates</h1>
        <p className="text-sm text-muted-foreground">Edit the letter body used when generating each document type.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{LETTER_TYPE_LABELS[t.type]}</CardTitle>
              <Badge variant="secondary">v{t.version}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t.name}</p>
              <EditTemplateDialog templateId={t.id} name={t.name} htmlBody={t.htmlBody} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
