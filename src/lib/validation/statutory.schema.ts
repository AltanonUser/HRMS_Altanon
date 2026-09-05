import { z } from "zod";

export const statutoryConfigSchema = z.object({
  financialYear: z.string().min(1),
  pfEmployeeRate: z.coerce.number().min(0).max(1),
  pfEmployerRate: z.coerce.number().min(0).max(1),
  pfWageCeiling: z.coerce.number().positive(),
  standardDeduction: z.coerce.number().min(0),
  defaultRegime: z.enum(["OLD", "NEW"]),
  notes: z.string().optional().or(z.literal("")),
});
export type StatutoryConfigInput = z.infer<typeof statutoryConfigSchema>;
