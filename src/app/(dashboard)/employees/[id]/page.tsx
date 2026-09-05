import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { decryptPII, maskTail } from "@/lib/utils/encryption";
import { formatDateIN } from "@/lib/utils/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { OffboardDialog } from "../offboard-dialog";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const canViewAll = hasPermission(session, PERMISSIONS.EMPLOYEE_VIEW_ALL);
  const isSelf = session.employeeId === id;
  if (!canViewAll && !isSelf) {
    const visibleIds = new Set((await prisma.employee.findMany({ select: { id: true } })).map((e) => e.id));
    if (!visibleIds.has(id)) redirect("/employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      designation: true,
      reportingManager: { select: { id: true, firstName: true, lastName: true } },
      reports: { select: { id: true, firstName: true, lastName: true, designation: { select: { title: true } } } },
      user: { select: { id: true, email: true, isActive: true } },
    },
  });
  if (!employee) notFound();

  const canUpdate = hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE);
  const canOffboard = hasPermission(session, PERMISSIONS.EMPLOYEE_OFFBOARD);
  const canSeeSensitive = canViewAll || isSelf;

  const pan = canSeeSensitive ? decryptPII(employee.panNumberEnc) : null;
  const aadhaar = canSeeSensitive ? decryptPII(employee.aadhaarNumberEnc) : null;
  const bankAccountNumber = canSeeSensitive ? decryptPII(employee.bankAccountNumberEnc) : null;
  const bankIfsc = canSeeSensitive ? decryptPII(employee.bankIfscEnc) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-sm text-muted-foreground">
            {employee.employeeCode} · {employee.designation.title} · {employee.department.name}
          </p>
          <Badge className="mt-2" variant={employee.employmentStatus === "ACTIVE" ? "default" : "outline"}>
            {employee.employmentStatus.replace("_", " ")}
          </Badge>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <Button render={<Link href={`/employees/${id}/edit`} />} nativeButton={false} variant="outline" size="sm">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {canOffboard && employee.employmentStatus === "ACTIVE" && <OffboardDialog employeeId={id} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Official Email" value={employee.officialEmail ?? "—"} />
            <InfoRow label="Personal Email" value={employee.personalEmail ?? "—"} />
            <InfoRow label="Phone" value={employee.phone ?? "—"} />
            <InfoRow label="Date of Birth" value={employee.dob ? formatDateIN(employee.dob) : "—"} />
            <InfoRow label="Address" value={employee.address ?? "—"} full />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Date of Joining" value={formatDateIN(employee.dateOfJoining)} />
            <InfoRow label="Employment Type" value={employee.employmentType.replace("_", " ")} />
            <InfoRow label="Reports To" value={employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : "—"} />
            <InfoRow label="Login" value={employee.user ? employee.user.email : "No account"} />
            {employee.dateOfLeaving && <InfoRow label="Last Working Day" value={formatDateIN(employee.dateOfLeaving)} />}
          </CardContent>
        </Card>

        {canSeeSensitive && (
          <Card>
            <CardHeader><CardTitle className="text-base">Statutory & Bank</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="PAN" value={pan ? maskTail(pan) : "—"} />
              <InfoRow label="Aadhaar" value={aadhaar ? maskTail(aadhaar) : "—"} />
              <InfoRow label="Bank" value={employee.bankName ?? "—"} />
              <InfoRow label="Account No." value={bankAccountNumber ? maskTail(bankAccountNumber) : "—"} />
              <InfoRow label="IFSC" value={bankIfsc ?? "—"} />
            </CardContent>
          </Card>
        )}

        {employee.reports.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Direct Reports ({employee.reports.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {employee.reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/employees/${r.id}`} className="hover:underline">{r.firstName} {r.lastName}</Link>
                    <span className="text-muted-foreground"> — {r.designation.title}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
