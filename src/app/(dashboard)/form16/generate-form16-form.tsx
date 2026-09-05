"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateForm16PartB } from "@/server/actions/form16.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentFinancialYear } from "@/lib/utils/dates";

type Option = { id: string; label: string };

export function GenerateForm16Form({ employees }: { employees: Option[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const currentFY = currentFinancialYear();
  const fyOptions = [currentFY, `${parseInt(currentFY.split("-")[0]) - 1}-${currentFY.split("-")[0].slice(-2)}`];
  const [fy, setFy] = useState(currentFY);
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!employeeId) {
      toast.error("Select an employee.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await generateForm16PartB(employeeId, fy);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Form 16 Part B generated");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Generate Form 16 (Part B)</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")} items={Object.fromEntries(employees.map((e) => [e.id, e.label]))}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select employee" /></SelectTrigger>
          <SelectContent>
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fy} onValueChange={(v) => setFy(v ?? currentFY)} items={Object.fromEntries(fyOptions.map((y) => [y, y]))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {fyOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleGenerate} disabled={submitting}>{submitting ? "Generating..." : "Generate"}</Button>
      </CardContent>
    </Card>
  );
}
