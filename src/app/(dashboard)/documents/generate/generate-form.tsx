"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LETTER_TYPE_LABELS, LETTER_TYPE_SOURCE, LETTER_FIELDS } from "@/lib/documents/fieldConfig";
import { computeDefaultValues, splitCtcIntoComponents, type CandidateSource, type EmployeeSource, type PfConfig } from "./compute-defaults";
import { formatINR } from "@/lib/utils/currency";
import { generateDocument } from "@/server/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GenerateDocumentForm({
  candidates,
  employees,
  companyDefaults,
  pfConfig,
  initialType,
  initialCandidateId,
  initialEmployeeId,
}: {
  candidates: CandidateSource[];
  employees: EmployeeSource[];
  companyDefaults: { hrName: string; hrTitle: string; workLocation: string };
  pfConfig: PfConfig;
  initialType?: string;
  initialCandidateId?: string;
  initialEmployeeId?: string;
}) {
  const router = useRouter();
  const initialTypeValue = initialType && LETTER_TYPE_LABELS[initialType] ? initialType : "OFFER_LETTER";

  const [type, setType] = useState(initialTypeValue);
  const [candidateId, setCandidateId] = useState(initialCandidateId ?? "");
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [values, setValues] = useState<Record<string, string>>(() =>
    computeDefaultValues(
      initialTypeValue,
      candidates.find((c) => c.id === initialCandidateId) ?? null,
      employees.find((e) => e.id === initialEmployeeId) ?? null,
      companyDefaults,
      pfConfig
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const source = LETTER_TYPE_SOURCE[type];

  // Recompute the field defaults for a given selection right when the user makes it, rather than
  // reactively in an effect (which would cause an extra cascading render on every selection change).
  const recomputeValues = (nextType: string, nextCandidateId: string, nextEmployeeId: string) => {
    const candidate = candidates.find((c) => c.id === nextCandidateId) ?? null;
    const employee = employees.find((e) => e.id === nextEmployeeId) ?? null;
    setValues(computeDefaultValues(nextType, candidate, employee, companyDefaults, pfConfig));
  };

  const handleTypeChange = (nextType: string) => {
    setType(nextType);
    recomputeValues(nextType, candidateId, employeeId);
  };
  const handleCandidateChange = (nextId: string) => {
    setCandidateId(nextId);
    recomputeValues(type, nextId, employeeId);
  };
  const handleEmployeeChange = (nextId: string) => {
    setEmployeeId(nextId);
    recomputeValues(type, candidateId, nextId);
  };

  const fields = useMemo(() => LETTER_FIELDS[type] ?? [], [type]);
  const salaryFields = useMemo(() => fields.filter((f) => f.group === "salary"), [fields]);
  const otherFields = useMemo(() => fields.filter((f) => f.group !== "salary"), [fields]);
  const hasSalaryBreakup = salaryFields.length > 0;

  const salaryTotal = salaryFields.reduce((sum, f) => sum + (Number(values[f.key]) || 0), 0);
  const ctcTotal = Number(values.ctcAnnual) || 0;
  const salaryMismatch = hasSalaryBreakup && Math.abs(salaryTotal - ctcTotal) > 1;

  const autoSplitSalary = () => {
    if (!ctcTotal) {
      toast.error("Enter Total Annual CTC first.");
      return;
    }
    const split = splitCtcIntoComponents(ctcTotal, pfConfig);
    setValues((v) => ({
      ...v,
      basicAnnual: String(split.basicAnnual),
      hraAnnual: String(split.hraAnnual),
      conveyanceAnnual: String(split.conveyanceAnnual),
      specialAllowanceAnnual: String(split.specialAllowanceAnnual),
      employerPfAnnual: String(split.employerPfAnnual),
    }));
  };

  const handleSubmit = async () => {
    if (source === "candidate" && !candidateId) {
      toast.error("Select a candidate first.");
      return;
    }
    if (source === "employee" && !employeeId) {
      toast.error("Select an employee first.");
      return;
    }
    const missing = fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    if (salaryMismatch) {
      toast.error("Salary components don't add up to the Total Annual CTC. Use Auto-split or adjust manually.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await generateDocument({
        type: type as never,
        candidateId: source === "candidate" ? candidateId : null,
        employeeId: source === "employee" ? employeeId : null,
        values,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Document generated");
      router.push(`/documents/${result.documentId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Document Type & Recipient</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Letter type</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v ?? "OFFER_LETTER")} items={LETTER_TYPE_LABELS}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LETTER_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {source === "candidate" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Candidate</Label>
              <Select
                value={candidateId}
                onValueChange={(v) => handleCandidateChange(v ?? "")}
                items={Object.fromEntries(candidates.map((c) => [c.id, `${c.fullName} — ${c.positionTitle}`]))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select candidate" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.fullName} — {c.positionTitle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Employee</Label>
              <Select
                value={employeeId}
                onValueChange={(v) => handleEmployeeChange(v ?? "")}
                items={Object.fromEntries(employees.map((e) => [e.id, `${e.fullName} — ${e.employeeCode}`]))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.fullName} — {e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{LETTER_TYPE_LABELS[type]} Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {otherFields.map((field) => (
            <div key={field.key} className={`flex flex-col gap-1.5 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
              <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {hasSalaryBreakup && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Salary Structure (Annual CTC Breakup)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={autoSplitSalary}>Auto-split</Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {salaryFields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label>{field.label}<span className="text-destructive"> *</span></Label>
                  <Input
                    type="number"
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className={`rounded-md border p-3 text-sm ${salaryMismatch ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
              <p>Components total: {formatINR(salaryTotal)} · Total Annual CTC: {formatINR(ctcTotal)}</p>
              {salaryMismatch && <p className="text-destructive">These must match before generating.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Generating..." : "Generate PDF"}
        </Button>
      </div>
    </div>
  );
}
