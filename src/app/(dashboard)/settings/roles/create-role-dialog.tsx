"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { roleSchema, type RoleInput } from "@/lib/validation/user.schema";
import { createRole } from "@/server/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function CreateRoleDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<
    z.input<typeof roleSchema>,
    unknown,
    z.output<typeof roleSchema>
  >({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", label: "", description: "", permissionCodes: [] },
  });

  const onSubmit = async (data: RoleInput) => {
    setSubmitting(true);
    try {
      const result = await createRole(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Role created — assign permissions below.");
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4" /> New Role</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>New Role</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Display name</Label>
            <Input id="label" placeholder="e.g. Team Lead" {...register("label")} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Internal code</Label>
            <Input id="name" placeholder="e.g. TEAM_LEAD" className="uppercase" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" {...register("description")} />
          </div>
          <p className="text-xs text-muted-foreground">You&apos;ll assign specific permissions after creating the role.</p>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create role"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
