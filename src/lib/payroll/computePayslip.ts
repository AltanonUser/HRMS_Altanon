import type { SalaryStructureComponent, SalaryComponentType, StatutoryConfig, TaxRegime } from "@prisma/client";
import { computePF } from "./pf";
import { computeProfessionalTax } from "./professionalTax";
import { estimateMonthlyTDS } from "./tds";
import { COMPONENT_CODES } from "./componentCodes";

export type StructureComponentWithType = SalaryStructureComponent & { componentType: SalaryComponentType };

// componentTypeId is resolved by the caller (payroll run service) from a code -> SalaryComponentType.id
// map it loads once per run, since PF/PT/TDS line items are computed here but still need to reference
// real seeded SalaryComponentType rows (category DEDUCTION/EMPLOYER_CONTRIBUTION) to persist correctly.
export type PayslipLineItem = { code: string; label: string; category: string; amount: number };

export type PayslipComputation = {
  daysInMonth: number;
  daysPaid: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  lineItems: PayslipLineItem[];
  employerContributionTotal: number;
};

/**
 * Computes one employee's payslip for a given month from their active salary structure.
 * Amounts are frozen here and persisted as-is — never recomputed later from a since-changed
 * structure (see the plan's snapshot principle for payroll data).
 */
export function computePayslip(params: {
  components: StructureComponentWithType[];
  statutoryConfig: StatutoryConfig;
  daysInMonth: number;
  daysPaid: number;
  month: number; // 1-12
  taxRegime: TaxRegime;
}): PayslipComputation {
  const { components, statutoryConfig, daysInMonth, daysPaid, month, taxRegime } = params;
  const proration = daysInMonth > 0 ? daysPaid / daysInMonth : 1;

  const lineItems: PayslipLineItem[] = [];
  let grossEarnings = 0;
  let otherDeductions = 0;
  let basicMonthly = 0;
  let annualGrossForTds = 0;

  for (const sc of components) {
    const monthlyFull = Number(sc.monthlyAmount);
    if (sc.componentType.category === "EARNING") {
      const prorated = round2(monthlyFull * proration);
      grossEarnings += prorated;
      annualGrossForTds += monthlyFull * 12;
      if (sc.componentType.code === COMPONENT_CODES.BASIC) basicMonthly = prorated;
      lineItems.push({
        code: sc.componentType.code,
        label: sc.componentType.label,
        category: sc.componentType.category,
        amount: prorated,
      });
    } else if (sc.componentType.category === "DEDUCTION") {
      const prorated = round2(monthlyFull * proration);
      otherDeductions += prorated;
      lineItems.push({
        code: sc.componentType.code,
        label: sc.componentType.label,
        category: sc.componentType.category,
        amount: prorated,
      });
    }
  }

  const pfComponentType = components.find((c) => c.componentType.code === COMPONENT_CODES.BASIC)?.componentType;
  const pf = pfComponentType?.isPfApplicable !== false ? computePF(basicMonthly, statutoryConfig) : null;
  const pfEmployee = pf?.employeeEPF ?? 0;
  const employerContributionTotal = pf?.employerTotal ?? 0;

  const pt = computeProfessionalTax(grossEarnings, month, statutoryConfig);
  const tds = estimateMonthlyTDS(annualGrossForTds, taxRegime, statutoryConfig);

  if (pf) {
    lineItems.push({
      code: COMPONENT_CODES.PF_EMPLOYEE,
      label: "Provident Fund (Employee)",
      category: "DEDUCTION",
      amount: pfEmployee,
    });
  }
  lineItems.push({
    code: COMPONENT_CODES.PROFESSIONAL_TAX,
    label: "Professional Tax",
    category: "DEDUCTION",
    amount: pt,
  });
  lineItems.push({
    code: COMPONENT_CODES.TDS,
    label: "Income Tax (TDS)",
    category: "DEDUCTION",
    amount: tds,
  });

  const totalDeductions = round2(otherDeductions + pfEmployee + pt + tds);
  const netPay = round2(grossEarnings - totalDeductions);

  return {
    daysInMonth,
    daysPaid,
    grossEarnings: round2(grossEarnings),
    totalDeductions,
    netPay,
    lineItems,
    employerContributionTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
