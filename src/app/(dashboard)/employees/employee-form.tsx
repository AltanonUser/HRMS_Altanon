"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { employeeSchema, type EmployeeInput } from "@/lib/validation/employee.schema";
import { createEmployee, updateEmployee } from "@/server/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

export function EmployeeForm({
  departments,
  designations,
  managers,
  editing,
}: {
  departments: Option[];
  designations: Option[];
  managers: Option[];
  editing?: { id: string } & Partial<EmployeeInput>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: editing?.firstName ?? "",
      lastName: editing?.lastName ?? "",
      personalEmail: editing?.personalEmail ?? "",
      officialEmail: editing?.officialEmail ?? "",
      phone: editing?.phone ?? "",
      dob: editing?.dob ?? "",
      panNumber: editing?.panNumber ?? "",
      aadhaarNumber: editing?.aadhaarNumber ?? "",
      bankAccountName: editing?.bankAccountName ?? "",
      bankAccountNumber: editing?.bankAccountNumber ?? "",
      bankIfsc: editing?.bankIfsc ?? "",
      bankName: editing?.bankName ?? "",
      address: editing?.address ?? "",
      departmentId: editing?.departmentId ?? "",
      designationId: editing?.designationId ?? "",
      reportingManagerId: editing?.reportingManagerId ?? null,
      dateOfJoining: editing?.dateOfJoining ?? "",
      employmentType: editing?.employmentType ?? "FULL_TIME",
    },
  });

  const onSubmit = async (data: EmployeeInput) => {
    setSubmitting(true);
    try {
      const result = editing ? await updateEmployee(editing.id, data) : await createEmployee(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Employee updated" : "Employee added");
      router.push(editing ? `/employees/${editing.id}` : `/employees/${"employeeId" in result ? result.employeeId : ""}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="Personal email" error={errors.personalEmail?.message}>
            <Input type="email" {...register("personalEmail")} />
          </Field>
          <Field label="Official email" error={errors.officialEmail?.message}>
            <Input type="email" {...register("officialEmail")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
          <Field label="Date of birth" error={errors.dob?.message}>
            <Input type="date" {...register("dob")} />
          </Field>
          <Field label="Address" error={errors.address?.message} full>
            <Input {...register("address")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" error={errors.departmentId?.message}>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} items={Object.fromEntries(departments.map((d) => [d.id, d.label]))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Designation" error={errors.designationId?.message}>
            <Controller
              control={control}
              name="designationId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} items={Object.fromEntries(designations.map((d) => [d.id, d.label]))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Reporting manager (optional)">
            <Controller
              control={control}
              name="reportingManagerId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  items={{ none: "None", ...Object.fromEntries(managers.filter((m) => m.id !== editing?.id).map((m) => [m.id, m.label])) }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.filter((m) => m.id !== editing?.id).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Employment type" error={errors.employmentType?.message}>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={{ FULL_TIME: "Full-time", INTERN: "Intern", CONTRACT: "Contract" }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full-time</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Date of joining" error={errors.dateOfJoining?.message}>
            <Input type="date" {...register("dateOfJoining")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statutory & Bank Details</CardTitle>
          {editing && (
            <p className="text-xs text-muted-foreground">
              Stored values are encrypted and not shown here for security — leave a field blank to keep it unchanged, or type a new value to replace it.
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="PAN number" error={errors.panNumber?.message}>
            <Input placeholder="ABCDE1234F" className="uppercase" {...register("panNumber")} />
          </Field>
          <Field label="Aadhaar number" error={errors.aadhaarNumber?.message}>
            <Input placeholder="12 digits" {...register("aadhaarNumber")} />
          </Field>
          <Field label="Bank account holder name" error={errors.bankAccountName?.message}>
            <Input {...register("bankAccountName")} />
          </Field>
          <Field label="Bank account number" error={errors.bankAccountNumber?.message}>
            <Input {...register("bankAccountNumber")} />
          </Field>
          <Field label="Bank IFSC" error={errors.bankIfsc?.message}>
            <Input placeholder="ABCD0123456" className="uppercase" {...register("bankIfsc")} />
          </Field>
          <Field label="Bank name" error={errors.bankName?.message}>
            <Input {...register("bankName")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : editing ? "Save changes" : "Add employee"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
