"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSalaryStructure } from "@/server/actions/payroll.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils/currency";

type EmployeeOption = { id: string; label: string };
type ComponentType = { id: string; code: string; label: string; category: string };

export function StructureForm({ employees, componentTypes }: { employees: EmployeeOption[]; componentTypes: ComponentType[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [ctcAnnual, setCtcAnnual] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const earningTypes = useMemo(() => componentTypes.filter((c) => c.category === "EARNING"), [componentTypes]);

  const monthlyTotal = earningTypes.reduce((sum, c) => sum + (Number(amounts[c.id]) || 0), 0);
  const expectedMonthly = (Number(ctcAnnual) || 0) / 12;
  const diff = monthlyTotal - expectedMonthly;

  const autoSplit = () => {
    const ctc = Number(ctcAnnual);
    if (!ctc) {
      toast.error("Enter Annual CTC first.");
      return;
    }
    const monthly = ctc / 12;
    const basic = Math.round(monthly * 0.4);
    const hra = Math.round(monthly * 0.2);
    const conveyance = Math.min(1600, Math.round(monthly * 0.05));
    const special = Math.round(monthly - basic - hra - conveyance);

    const next: Record<string, string> = {};
    for (const ct of earningTypes) {
      if (ct.code === "BASIC") next[ct.id] = String(basic);
      else if (ct.code === "HRA") next[ct.id] = String(hra);
      else if (ct.code === "CONVEYANCE") next[ct.id] = String(conveyance);
      else if (ct.code === "SPECIAL_ALLOWANCE") next[ct.id] = String(special);
      else next[ct.id] = amounts[ct.id] ?? "0";
    }
    setAmounts(next);
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error("Select an employee.");
      return;
    }
    if (Math.abs(diff) > 5) {
      toast.error("Component total must match Annual CTC ÷ 12. Use Auto-split or adjust manually.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createSalaryStructure({
        employeeId,
        ctcAnnual: Number(ctcAnnual),
        effectiveFrom,
        components: earningTypes.map((ct) => ({
          componentTypeId: ct.id,
          code: ct.code,
          monthlyAmount: Number(amounts[ct.id]) || 0,
        })),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Salary structure saved");
      router.push("/payroll/structures");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">New Salary Structure</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")} items={Object.fromEntries(employees.map((e) => [e.id, e.label]))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Annual CTC (₹)</Label>
            <Input type="number" value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Monthly Component Breakdown</p>
          <Button type="button" variant="outline" size="sm" onClick={autoSplit}>Auto-split</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {earningTypes.map((ct) => (
            <div key={ct.id} className="flex flex-col gap-1.5">
              <Label>{ct.label}</Label>
              <Input
                type="number"
                value={amounts[ct.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [ct.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className={`rounded-md border p-3 text-sm ${Math.abs(diff) > 5 ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
          <p>Monthly total: {formatINR(monthlyTotal)} · Expected (CTC ÷ 12): {formatINR(expectedMonthly)}</p>
          {Math.abs(diff) > 5 && <p className="text-destructive">Difference: {formatINR(diff)}</p>}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save structure"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
