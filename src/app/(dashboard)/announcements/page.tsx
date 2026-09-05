import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import { DeleteAnnouncementButton } from "./delete-announcement-button";
import { formatDateIN } from "@/lib/utils/dates";

export default async function AnnouncementsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const canManage = hasPermission(session, PERMISSIONS.ANNOUNCEMENT_MANAGE);

  const announcements = await prisma.announcement.findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Company-wide updates and notices.</p>
        </div>
        {canManage && <CreateAnnouncementDialog />}
      </div>

      <div className="flex flex-col gap-3">
        {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-start justify-between pt-6">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.title}</p>
                  {a.isPinned && <Badge variant="secondary">Pinned</Badge>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateIN(a.createdAt)}</p>
              </div>
              {canManage && <DeleteAnnouncementButton id={a.id} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
