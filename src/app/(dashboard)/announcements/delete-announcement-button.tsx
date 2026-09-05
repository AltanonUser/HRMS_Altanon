"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAnnouncement } from "@/server/actions/announcement.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteAnnouncement(id);
          if (!result.success) toast.error(result.error);
          else router.refresh();
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
