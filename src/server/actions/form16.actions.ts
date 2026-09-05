"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { renderCustomPdf } from "@/lib/pdf/renderToPdf";
import { buildForm16PartBHtml } from "@/lib/pdf/templates/form16Template";
import { decryptPII } from "@/lib/utils/encryption";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const FORM16_DIR = path.join(process.cwd(), "storage", "form16");

function fyMonthYearRange(financialYear: string): { start: { month: number; year: number }; end: { month: number; year: number } } {
  const startYear = parseInt(financialYear.split("-")[0], 10);
  return { start: { month: 4, year: startYear }, end: { month: 3, year: startYear + 1 } };
}

export async function generateForm16PartB(employeeId: string, financialYear: string): Promise<ActionResult & { recordId?: string }> {
  try {
    const session = await requirePermission(PERMISSIONS.FORM16_GENERATE);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { designation: true } });
    if (!employee) return { success: false, error: "Employee not found." };

    const config = await prisma.statutoryConfig.findUnique({ where: { financialYear } });
    if (!config) return { success: false, error: `No statutory configuration for FY ${financialYear}.` };

    const company = await prisma.companyProfile.findFirst();
    if (!company) return { success: false, error: "Company profile is not configured yet." };

    const { start, end } = fyMonthYearRange(financialYear);
    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId,
        run: {
          OR: [
            { year: start.year, month: { gte: start.month } },
            { year: end.year, month: { lte: end.month } },
          ],
        },
      },
      include: { lineItems: { include: { componentType: true } } },
    });

    if (payslips.length === 0) {
      return { success: false, error: `No payroll runs found for ${employee.firstName} in FY ${financialYear}.` };
    }

    const grossSalary = payslips.reduce((sum, p) => sum + Number(p.grossEarnings), 0);
    const totalTds = payslips.reduce((sum, p) => {
      const tdsItem = p.lineItems.find((li) => li.componentType.code === "TDS");
      return sum + (tdsItem ? Number(tdsItem.amount) : 0);
    }, 0);

    const standardDeduction = Number(config.standardDeduction);
    const taxableIncome = Math.max(grossSalary - standardDeduction, 0);
    const pan = decryptPII(employee.panNumberEnc);

    const html = buildForm16PartBHtml({
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      pan,
      designation: employee.designation.title,
      financialYear,
      regime: config.defaultRegime,
      grossSalary,
      standardDeduction,
      taxableIncome,
      totalTdsDeducted: totalTds,
    });

    const pdfBuffer = await renderCustomPdf(
      html,
      { displayName: company.displayName, legalName: company.legalName, cin: company.cin, registeredAddress: company.registeredAddress, website: company.website },
      `Form 16 — Part B (FY ${financialYear})`
    );

    await fs.mkdir(FORM16_DIR, { recursive: true });

    const record = await prisma.form16Record.upsert({
      where: { employeeId_financialYear: { employeeId, financialYear } },
      update: {
        regime: config.defaultRegime,
        grossSalary,
        deductionsTotal: standardDeduction,
        taxableIncome,
        totalTdsDeducted: totalTds,
        status: "PART_B_GENERATED",
        generatedById: session.id,
      },
      create: {
        employeeId,
        financialYear,
        regime: config.defaultRegime,
        grossSalary,
        deductionsTotal: standardDeduction,
        taxableIncome,
        totalTdsDeducted: totalTds,
        status: "PART_B_GENERATED",
        generatedById: session.id,
      },
    });

    const partBPath = path.join(FORM16_DIR, `${record.id}_partB.pdf`);
    await fs.writeFile(partBPath, pdfBuffer);
    await prisma.form16Record.update({ where: { id: record.id }, data: { partBPdfPath: partBPath } });

    await logAudit({ actorUserId: session.id, action: "GENERATE", entityType: "Form16Record", entityId: record.id });
    revalidatePath("/form16");
    return { success: true, recordId: record.id };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function uploadForm16PartA(recordId: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.FORM16_GENERATE);

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { success: false, error: "Select a PDF file to upload." };
    if (file.type !== "application/pdf") return { success: false, error: "Part A must be a PDF file." };

    const record = await prisma.form16Record.findUnique({ where: { id: recordId } });
    if (!record) return { success: false, error: "Form 16 record not found." };

    await fs.mkdir(FORM16_DIR, { recursive: true });
    const partAPath = path.join(FORM16_DIR, `${record.id}_partA.pdf`);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(partAPath, bytes);

    let mergedPath: string | null = null;
    if (record.partBPdfPath) {
      const merged = await PDFDocument.create();
      const partADoc = await PDFDocument.load(bytes);
      const partBDoc = await PDFDocument.load(await fs.readFile(record.partBPdfPath));
      const partAPages = await merged.copyPages(partADoc, partADoc.getPageIndices());
      partAPages.forEach((p) => merged.addPage(p));
      const partBPages = await merged.copyPages(partBDoc, partBDoc.getPageIndices());
      partBPages.forEach((p) => merged.addPage(p));

      mergedPath = path.join(FORM16_DIR, `${record.id}_merged.pdf`);
      await fs.writeFile(mergedPath, await merged.save());
    }

    await prisma.form16Record.update({
      where: { id: recordId },
      data: {
        partAUploadedPath: partAPath,
        mergedPdfPath: mergedPath,
        status: mergedPath ? "FINALIZED" : "PART_A_ATTACHED",
      },
    });

    await logAudit({ actorUserId: session.id, action: "UPLOAD_PART_A", entityType: "Form16Record", entityId: recordId });
    revalidatePath("/form16");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
