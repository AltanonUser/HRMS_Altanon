import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { decryptPII, maskTail } from "@/lib/utils/encryption";
import { formatDateIN } from "@/lib/utils/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MyProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.employeeId) {
    return <p className="text-sm text-muted-foreground">Your account isn&apos;t linked to an employee profile.</p>;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: {
      department: true,
      designation: true,
      reportingManager: { select: { firstName: true, lastName: true } },
    },
  });
  if (!employee) redirect("/dashboard");

  const pan = decryptPII(employee.panNumberEnc);
  const bankAccountNumber = decryptPII(employee.bankAccountNumberEnc);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</h1>
        <p className="text-sm text-muted-foreground">{employee.employeeCode} · {employee.designation.title} · {employee.department.name}</p>
        <Badge className="mt-2">{employee.employmentStatus.replace("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Official Email" value={employee.officialEmail ?? "—"} />
          <Info label="Personal Email" value={employee.personalEmail ?? "—"} />
          <Info label="Phone" value={employee.phone ?? "—"} />
          <Info label="Reports To" value={employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : "—"} />
          <Info label="Date of Joining" value={formatDateIN(employee.dateOfJoining)} />
          <Info label="Address" value={employee.address ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Statutory & Bank</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Info label="PAN" value={pan ? maskTail(pan) : "Not on file"} />
          <Info label="Bank" value={employee.bankName ?? "Not on file"} />
          <Info label="Account No." value={bankAccountNumber ? maskTail(bankAccountNumber) : "Not on file"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
