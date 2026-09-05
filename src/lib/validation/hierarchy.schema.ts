import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z
    .string()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, - or _"),
  parentDepartmentId: z.string().nullable().optional(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const designationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  grade: z.coerce.number().int().nullable().optional(),
});
export type DesignationInput = z.infer<typeof designationSchema>;
