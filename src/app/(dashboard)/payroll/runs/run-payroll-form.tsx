"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runPayroll } from "@/server/actions/payroll.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MONTH_NAMES } from "@/lib/utils/dates";
import { Play } from "lucide-react";

const MONTH_ITEMS = Object.fromEntries(MONTH_NAMES.map((name, i) => [String(i + 1), name]));

export function RunPayrollForm() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [running, setRunning] = useState(false);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runPayroll({ month: Number(month), year: Number(year) });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payroll run completed");
      router.push(`/payroll/runs/${result.runId}`);
      router.refresh();
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Run Payroll</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Select value={month} onValueChange={(v) => setMonth(v ?? month)} items={MONTH_ITEMS}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Select value={year} onValueChange={(v) => setYear(v ?? year)} items={Object.fromEntries(yearOptions.map((y) => [String(y), String(y)]))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRun} disabled={running}>
          <Play className="h-4 w-4" /> {running ? "Running..." : "Run Payroll"}
        </Button>
      </CardContent>
    </Card>
  );
}
