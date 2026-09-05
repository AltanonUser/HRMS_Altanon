import { z } from "zod";

export const companyProfileSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  displayName: z.string().min(1, "Display name is required"),
  cin: z.string().optional().or(z.literal("")),
  registeredAddress: z.string().min(1, "Registered address is required"),
  website: z.string().optional().or(z.literal("")),
  officialEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  signatoryName: z.string().optional().or(z.literal("")),
  signatoryTitle: z.string().optional().or(z.literal("")),
});
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
