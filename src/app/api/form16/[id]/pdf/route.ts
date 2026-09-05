import fs from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession, hasPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const record = await prisma.form16Record.findUnique({ where: { id } });
  if (!record) return new NextResponse("Not found", { status: 404 });

  const canViewAll = hasPermission(session, PERMISSIONS.FORM16_VIEW_ALL);
  const isOwn = record.employeeId === session.employeeId;
  if (!canViewAll && !isOwn) return new NextResponse("Forbidden", { status: 403 });

  const filePath = record.mergedPdfPath ?? record.partBPdfPath;
  if (!filePath) return new NextResponse("Not generated yet", { status: 404 });

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Form16_${record.financialYear}.pdf"` },
    });
  } catch {
    return new NextResponse("File not found on disk", { status: 404 });
  }
}
