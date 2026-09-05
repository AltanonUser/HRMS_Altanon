import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  roleId: z.string().min(1, "Role is required"),
  employeeId: z.string().nullable().optional(),
  temporaryPassword: z.string().min(10, "Temporary password must be at least 10 characters"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1, "Role is required"),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const roleSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores only"),
  label: z.string().min(1, "Label is required").max(60),
  description: z.string().max(300).optional().or(z.literal("")),
  permissionCodes: z.array(z.string()).default([]),
});
export type RoleInput = z.infer<typeof roleSchema>;
