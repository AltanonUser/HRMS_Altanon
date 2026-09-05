"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import crypto from "crypto";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/user.schema";
import { createUser } from "@/server/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Dices } from "lucide-react";

type Option = { id: string; label: string };

function generatePassword(): string {
  const bytes = crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(9)) : null;
  const random = bytes ? Buffer.from(bytes).toString("base64url") : Math.random().toString(36).slice(2, 14);
  return `Alt${random}!1`;
}

export function CreateUserDialog({ roles, employeesWithoutLogin }: { roles: Option[]; employeesWithoutLogin: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<{ email: string; password: string } | null>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, reset } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", roleId: "", employeeId: null, temporaryPassword: "" },
  });

  const temporaryPassword = watch("temporaryPassword");

  const onSubmit = async (data: CreateUserInput) => {
    setSubmitting(true);
    try {
      const result = await createUser(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreatedPassword({ email: data.email, password: data.temporaryPassword });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setCreatedPassword(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4" /> Add User</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{createdPassword ? "User Created" : "New User"}</DialogTitle></DialogHeader>
        {createdPassword ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Share these credentials with the user securely. They will be required to set their own password on first login.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p><span className="text-muted-foreground">Email:</span> {createdPassword.email}</p>
              <p><span className="text-muted-foreground">Temporary password:</span> <code>{createdPassword.password}</code></p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Link to employee (optional)</Label>
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    items={{ none: "None", ...Object.fromEntries(employeesWithoutLogin.map((e) => [e.id, e.label])) }}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employeesWithoutLogin.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={Object.fromEntries(roles.map((r) => [r.id, r.label]))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="temporaryPassword">Temporary password</Label>
              <div className="flex gap-2">
                <Input id="temporaryPassword" {...register("temporaryPassword")} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setValue("temporaryPassword", generatePassword())}
                  title="Generate"
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              {temporaryPassword && <p className="text-xs text-muted-foreground">User must change this on first login.</p>}
              {errors.temporaryPassword && <p className="text-sm text-destructive">{errors.temporaryPassword.message}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create user"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
