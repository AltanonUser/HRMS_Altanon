"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { statutoryConfigSchema, type StatutoryConfigInput } from "@/lib/validation/statutory.schema";
import { updateStatutoryConfig } from "@/server/actions/statutory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function StatutoryForm({ initial }: { initial: StatutoryConfigInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, control } = useForm<
    z.input<typeof statutoryConfigSchema>,
    unknown,
    z.output<typeof statutoryConfigSchema>
  >({
    resolver: zodResolver(statutoryConfigSchema),
    defaultValues: initial,
  });

  const onSubmit = async (data: StatutoryConfigInput) => {
    setSubmitting(true);
    try {
      const result = await updateStatutoryConfig(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Statutory config updated");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">FY {initial.financialYear}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Verify these figures with your CA before running real payroll — rates and slabs change with each Finance Act.
          </AlertDescription>
        </Alert>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" {...register("financialYear")} />
          <div className="flex flex-col gap-1.5">
            <Label>PF Employee Rate (e.g. 0.12 = 12%)</Label>
            <Input type="number" step="0.0001" {...register("pfEmployeeRate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>PF Employer Rate</Label>
            <Input type="number" step="0.0001" {...register("pfEmployerRate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>PF Wage Ceiling (₹/month)</Label>
            <Input type="number" {...register("pfWageCeiling")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Standard Deduction (₹/year)</Label>
            <Input type="number" {...register("standardDeduction")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Default Tax Regime</Label>
            <Controller
              control={control}
              name="defaultRegime"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} items={{ NEW: "New Regime", OLD: "Old Regime" }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New Regime</SelectItem>
                    <SelectItem value="OLD">Old Regime</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} {...register("notes")} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
