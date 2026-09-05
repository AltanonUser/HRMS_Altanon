"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { offboardSchema, type OffboardInput } from "@/lib/validation/employee.schema";
import { offboardEmployee } from "@/server/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserMinus } from "lucide-react";

export function OffboardDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<OffboardInput>({
    resolver: zodResolver(offboardSchema),
    defaultValues: { employeeId, status: "RELIEVED", lastWorkingDay: "" },
  });

  const onSubmit = async (data: OffboardInput) => {
    setSubmitting(true);
    try {
      const result = await offboardEmployee(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Employee status updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm"><UserMinus className="h-4 w-4" /> Offboard</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Offboard Employee</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={{ ON_NOTICE: "On Notice", RELIEVED: "Relieved", TERMINATED: "Terminated" }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_NOTICE">On Notice</SelectItem>
                    <SelectItem value="RELIEVED">Relieved</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastWorkingDay">Last working day</Label>
            <Input id="lastWorkingDay" type="date" {...register("lastWorkingDay")} />
            {errors.lastWorkingDay && <p className="text-sm text-destructive">{errors.lastWorkingDay.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
