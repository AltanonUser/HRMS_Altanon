import fs from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const payslip = await prisma.payslip.findUnique({ where: { id } });
  if (!payslip || !payslip.pdfPath) return new NextResponse("Not found", { status: 404 });

  const canViewAll = hasPermission(session, PERMISSIONS.PAYSLIP_VIEW_ALL);
  const isOwn = payslip.employeeId === session.employeeId;
  if (!canViewAll && !isOwn) return new NextResponse("Forbidden", { status: 403 });

  try {
    const buffer = await fs.readFile(payslip.pdfPath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="payslip.pdf"` },
    });
  } catch {
    return new NextResponse("File not found on disk", { status: 404 });
  }
}
