"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { salaryStructureSchema, payrollRunSchema, type SalaryStructureInput, type PayrollRunInput } from "@/lib/validation/payroll.schema";
import { computePayslip } from "@/lib/payroll/computePayslip";
import { buildPayslipHtml } from "@/lib/pdf/templates/payslipTemplate";
import { renderCustomPdf } from "@/lib/pdf/renderToPdf";
import { decryptPII, maskTail } from "@/lib/utils/encryption";
import { daysInMonth as daysInMonthOf, financialYearOf } from "@/lib/utils/dates";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const PAYSLIP_DIR = path.join(process.cwd(), "storage", "payslips");

export async function createSalaryStructure(input: SalaryStructureInput): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);
    const parsed = salaryStructureSchema.parse(input);

    const monthlyTotal = parsed.components.reduce((sum, c) => sum + c.monthlyAmount, 0);
    const expectedMonthly = parsed.ctcAnnual / 12;
    if (Math.abs(monthlyTotal - expectedMonthly) > 5) {
      return {
        success: false,
        error: `Component total (₹${monthlyTotal.toFixed(2)}/mo) doesn't match Annual CTC ÷ 12 (₹${expectedMonthly.toFixed(2)}/mo).`,
      };
    }

    const effectiveFrom = new Date(parsed.effectiveFrom);

    await prisma.$transaction(async (tx) => {
      await tx.salaryStructure.updateMany({
        where: { employeeId: parsed.employeeId, status: "ACTIVE" },
        data: { status: "SUPERSEDED", effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
      });

      const structure = await tx.salaryStructure.create({
        data: {
          employeeId: parsed.employeeId,
          ctcAnnual: parsed.ctcAnnual,
          effectiveFrom,
          status: "ACTIVE",
          approvedById: session.id,
          createdById: session.id,
        },
      });

      await tx.salaryStructureComponent.createMany({
        data: parsed.components
          .filter((c) => c.monthlyAmount > 0)
          .map((c) => ({
            salaryStructureId: structure.id,
            componentTypeId: c.componentTypeId,
            monthlyAmount: c.monthlyAmount,
          })),
      });
    });

    await logAudit({ actorUserId: session.id, action: "CREATE", entityType: "SalaryStructure", entityId: parsed.employeeId, after: { ctcAnnual: parsed.ctcAnnual } });
    revalidatePath("/payroll/structures");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function runPayroll(input: PayrollRunInput): Promise<ActionResult & { runId?: string }> {
  try {
    const session = await requirePermission(PERMISSIONS.PAYROLL_RUN_EXECUTE);
    const parsed = payrollRunSchema.parse(input);

    const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month: parsed.month, year: parsed.year } } });
    if (existing) return { success: false, error: `Payroll for ${parsed.month}/${parsed.year} has already been run.` };

    const fy = financialYearOf(new Date(parsed.year, parsed.month - 1, 15));
    const statutoryConfig = await prisma.statutoryConfig.findUnique({ where: { financialYear: fy } });
    if (!statutoryConfig) return { success: false, error: `No statutory configuration found for FY ${fy}. Set it up under Statutory Config first.` };

    const company = await prisma.companyProfile.findFirst();
    if (!company) return { success: false, error: "Company profile is not configured yet." };

    const activeStructures = await prisma.salaryStructure.findMany({
      where: {
        status: "ACTIVE",
        employee: { employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] } },
      },
      include: {
        employee: { include: { department: true, designation: true } },
        components: { include: { componentType: true } },
      },
    });

    if (activeStructures.length === 0) {
      return { success: false, error: "No employees have an active salary structure yet." };
    }

    const allComponentTypes = await prisma.salaryComponentType.findMany();
    const componentIdByCode = new Map(allComponentTypes.map((c) => [c.code, c.id]));

    const run = await prisma.payrollRun.create({
      data: { month: parsed.month, year: parsed.year, status: "PROCESSING", processedById: session.id, processedAt: new Date() },
    });

    await fs.mkdir(PAYSLIP_DIR, { recursive: true });
    const days = daysInMonthOf(parsed.year, parsed.month);

    for (const structure of activeStructures) {
      const computation = computePayslip({
        components: structure.components,
        statutoryConfig,
        daysInMonth: days,
        daysPaid: days,
        month: parsed.month,
        taxRegime: statutoryConfig.defaultRegime,
      });

      const payslip = await prisma.payslip.create({
        data: {
          payrollRunId: run.id,
          employeeId: structure.employeeId,
          salaryStructureId: structure.id,
          daysInMonth: computation.daysInMonth,
          daysPaid: computation.daysPaid,
          grossEarnings: computation.grossEarnings,
          totalDeductions: computation.totalDeductions,
          netPay: computation.netPay,
        },
      });

      const lineItemsWithIds = computation.lineItems
        .map((li) => ({ componentTypeId: componentIdByCode.get(li.code), amount: li.amount }))
        .filter((li): li is { componentTypeId: string; amount: number } => Boolean(li.componentTypeId));

      await prisma.payslipComponent.createMany({
        data: lineItemsWithIds.map((li) => ({ payslipId: payslip.id, componentTypeId: li.componentTypeId, amount: li.amount })),
      });

      const bankAccount = decryptPII(structure.employee.bankAccountNumberEnc);
      const pan = decryptPII(structure.employee.panNumberEnc);

      const html = buildPayslipHtml({
        employeeName: `${structure.employee.firstName} ${structure.employee.lastName}`,
        employeeCode: structure.employee.employeeCode,
        designation: structure.employee.designation.title,
        department: structure.employee.department.name,
        month: parsed.month,
        year: parsed.year,
        daysInMonth: computation.daysInMonth,
        daysPaid: computation.daysPaid,
        bankName: structure.employee.bankName,
        bankAccountMasked: bankAccount ? maskTail(bankAccount) : null,
        panMasked: pan ? maskTail(pan) : null,
        earnings: computation.lineItems.filter((l) => l.category === "EARNING").map((l) => ({ label: l.label, amount: l.amount })),
        deductions: computation.lineItems.filter((l) => l.category === "DEDUCTION").map((l) => ({ label: l.label, amount: l.amount })),
        grossEarnings: computation.grossEarnings,
        totalDeductions: computation.totalDeductions,
        netPay: computation.netPay,
      });

      const pdfBuffer = await renderCustomPdf(
        html,
        { displayName: company.displayName, legalName: company.legalName, cin: company.cin, registeredAddress: company.registeredAddress, website: company.website },
        "Payslip"
      );
      const pdfPath = path.join(PAYSLIP_DIR, `${payslip.id}.pdf`);
      await fs.writeFile(pdfPath, pdfBuffer);
      await prisma.payslip.update({ where: { id: payslip.id }, data: { pdfPath } });
    }

    await prisma.payrollRun.update({ where: { id: run.id }, data: { status: "FINALIZED" } });
    await logAudit({ actorUserId: session.id, action: "PAYROLL_RUN", entityType: "PayrollRun", entityId: run.id, after: { month: parsed.month, year: parsed.year, employeeCount: activeStructures.length } });

    revalidatePath("/payroll/runs");
    return { success: true, runId: run.id };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
