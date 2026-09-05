import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  personalEmail: z.string().email().optional().or(z.literal("")),
  officialEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must look like ABCDE1234F")
    .optional()
    .or(z.literal("")),
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar must be 12 digits")
    .optional()
    .or(z.literal("")),
  bankAccountName: z.string().max(120).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(30).optional().or(z.literal("")),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC must look like ABCD0123456")
    .optional()
    .or(z.literal("")),
  bankName: z.string().max(120).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  reportingManagerId: z.string().nullable().optional(),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  employmentType: z.enum(["FULL_TIME", "INTERN", "CONTRACT"]),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const offboardSchema = z.object({
  employeeId: z.string().min(1),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
  status: z.enum(["ON_NOTICE", "RELIEVED", "TERMINATED"]),
});
export type OffboardInput = z.infer<typeof offboardSchema>;
