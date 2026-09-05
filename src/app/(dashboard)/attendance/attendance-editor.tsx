"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAttendanceForDate } from "@/server/actions/attendance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceStatus } from "@prisma/client";

type EmployeeRow = { id: string; name: string; status: AttendanceStatus };

const STATUS_ITEMS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  ON_LEAVE: "On Leave",
  HOLIDAY: "Holiday",
  WEEK_OFF: "Week Off",
};

export function AttendanceEditor({ date, employees }: { date: string; employees: EmployeeRow[] }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(date);
  const [rows, setRows] = useState(employees);
  const [saving, setSaving] = useState(false);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    router.push(`/attendance?date=${value}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveAttendanceForDate(selectedDate, rows.map((r) => ({ employeeId: r.id, status: r.status })));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Attendance saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="w-48" />
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Attendance"}</Button>
      </div>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Select
                    value={row.status}
                    onValueChange={(v) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: v as AttendanceStatus } : r)))}
                    items={STATUS_ITEMS}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_ITEMS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
