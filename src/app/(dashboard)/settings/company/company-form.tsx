"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/validation/company.schema";
import { updateCompanyProfile } from "@/server/actions/company.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompanyForm({ initial }: { initial: CompanyProfileInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: initial,
  });

  const onSubmit = async (data: CompanyProfileInput) => {
    setSubmitting(true);
    try {
      const result = await updateCompanyProfile(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Company profile updated");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Company Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name" error={errors.legalName?.message}><Input {...register("legalName")} /></Field>
          <Field label="Display name" error={errors.displayName?.message}><Input {...register("displayName")} /></Field>
          <Field label="CIN"><Input {...register("cin")} /></Field>
          <Field label="Website"><Input {...register("website")} /></Field>
          <Field label="Official email" error={errors.officialEmail?.message}><Input {...register("officialEmail")} /></Field>
          <Field label="Phone"><Input {...register("phone")} /></Field>
          <Field label="Registered address" error={errors.registeredAddress?.message} full>
            <Input {...register("registeredAddress")} />
          </Field>
          <Field label="Authorized signatory name"><Input {...register("signatoryName")} /></Field>
          <Field label="Signatory title"><Input {...register("signatoryTitle")} /></Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
