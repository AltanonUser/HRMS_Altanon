"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { candidateSchema, type CandidateInput } from "@/lib/validation/candidate.schema";
import { createCandidate } from "@/server/actions/candidate.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

export function CreateCandidateDialog({ departments }: { departments: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<
    z.input<typeof candidateSchema>,
    unknown,
    z.output<typeof candidateSchema>
  >({
    resolver: zodResolver(candidateSchema),
    defaultValues: { fullName: "", email: "", phone: "", positionTitle: "", departmentId: null, offeredCtc: null, proposedJoiningDate: "" },
  });

  const onSubmit = async (data: CandidateInput) => {
    setSubmitting(true);
    try {
      const result = await createCandidate(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Candidate added");
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4" /> Add Candidate</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>New Candidate</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="positionTitle">Position</Label>
            <Input id="positionTitle" {...register("positionTitle")} />
            {errors.positionTitle && <p className="text-sm text-destructive">{errors.positionTitle.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Department (optional)</Label>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  items={{ none: "None", ...Object.fromEntries(departments.map((d) => [d.id, d.label])) }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offeredCtc">Offered CTC (annual, ₹)</Label>
            <Input id="offeredCtc" type="number" {...register("offeredCtc")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposedJoiningDate">Proposed joining date</Label>
            <Input id="proposedJoiningDate" type="date" {...register("proposedJoiningDate")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Add candidate"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
