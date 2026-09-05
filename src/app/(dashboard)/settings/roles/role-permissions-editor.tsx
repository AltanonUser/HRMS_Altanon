"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PERMISSION_GROUPS } from "@/lib/rbac/permissions";
import { updateRolePermissions } from "@/server/actions/user.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RolePermissionsEditor({
  roleId,
  roleLabel,
  isSystemRole,
  initialCodes,
}: {
  roleId: string;
  roleLabel: string;
  isSystemRole: boolean;
  initialCodes: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCodes));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateRolePermissions(roleId, Array.from(selected));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${roleLabel} permissions updated`);
      setDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">{roleLabel}</CardTitle>
        {isSystemRole && <Badge variant="secondary">System role</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{selected.size} permission{selected.size === 1 ? "" : "s"}</span>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.module} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.module}</p>
            {group.items.map((item) => (
              <label key={item.code} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected.has(item.code)} onCheckedChange={() => toggle(item.code)} />
                {item.label}
              </label>
            ))}
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}
