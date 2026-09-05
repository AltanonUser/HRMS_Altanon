import { z } from "zod";

export const candidateSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().optional().or(z.literal("")),
  positionTitle: z.string().min(1, "Position is required"),
  departmentId: z.string().nullable().optional(),
  offeredCtc: z.coerce.number().positive().nullable().optional(),
  proposedJoiningDate: z.string().optional().or(z.literal("")),
});
export type CandidateInput = z.infer<typeof candidateSchema>;
