"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideLeaveRequest } from "@/server/actions/leave.actions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function DecisionButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (approve: boolean) =>
    startTransition(async () => {
      const result = await decideLeaveRequest(requestId, approve);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(approve ? "Leave approved" : "Leave rejected");
        router.refresh();
      }
    });

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => decide(true)}>
        <Check className="h-4 w-4" /> Approve
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(false)}>
        <X className="h-4 w-4" /> Reject
      </Button>
    </div>
  );
}
