"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateUserRole, setUserActive } from "@/server/actions/user.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Option = { id: string; label: string };

export function UserRowActions({
  userId,
  currentRoleId,
  roles,
  isActive,
  isSelf,
}: {
  userId: string;
  currentRoleId: string;
  roles: Option[];
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(currentRoleId);
  const [pending, startTransition] = useTransition();

  const handleRoleChange = (value: string | null) => {
    if (!value) return;
    setRoleId(value);
    startTransition(async () => {
      const result = await updateUserRole({ userId, roleId: value });
      if (!result.success) {
        toast.error(result.error);
        setRoleId(currentRoleId);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      const result = await setUserActive(userId, !isActive);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? "User deactivated" : "User activated");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={roleId}
        onValueChange={handleRoleChange}
        disabled={pending}
        items={Object.fromEntries(roles.map((r) => [r.id, r.label]))}
      >
        <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        variant={isActive ? "outline" : "default"}
        size="sm"
        disabled={pending || isSelf}
        onClick={handleToggleActive}
        title={isSelf ? "You cannot deactivate your own account" : undefined}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
