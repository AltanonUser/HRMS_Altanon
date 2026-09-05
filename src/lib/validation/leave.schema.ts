import { z } from "zod";

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().max(500).optional().or(z.literal("")),
});
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
