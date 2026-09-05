"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { departmentSchema, type DepartmentInput } from "@/lib/validation/hierarchy.schema";
import { createDepartment, updateDepartment } from "@/server/actions/hierarchy.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type DepartmentOption = { id: string; name: string };

export function DepartmentFormDialog({
  departments,
  editing,
  trigger,
}: {
  departments: DepartmentOption[];
  editing?: { id: string; name: string; code: string; parentDepartmentId: string | null };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: editing ?? { name: "", code: "", parentDepartmentId: null },
  });

  const parentDepartmentId = watch("parentDepartmentId");

  const onSubmit = async (data: DepartmentInput) => {
    setSubmitting(true);
    try {
      const result = editing ? await updateDepartment(editing.id, data) : await createDepartment(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Department updated" : "Department created");
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm">
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="e.g. ENG" {...register("code")} className="uppercase" />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Parent department (optional)</Label>
            <Select
              value={parentDepartmentId ?? "none"}
              onValueChange={(v) => setValue("parentDepartmentId", v === "none" ? null : v)}
              items={{ none: "None", ...Object.fromEntries(departments.filter((d) => d.id !== editing?.id).map((d) => [d.id, d.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments
                  .filter((d) => d.id !== editing?.id)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
