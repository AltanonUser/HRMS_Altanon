import { z } from "zod";

export const salaryStructureSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  ctcAnnual: z.coerce.number().positive("CTC must be greater than zero"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  components: z
    .array(
      z.object({
        componentTypeId: z.string().min(1),
        code: z.string(),
        monthlyAmount: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one earning component is required"),
});
export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;

export const payrollRunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});
export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
