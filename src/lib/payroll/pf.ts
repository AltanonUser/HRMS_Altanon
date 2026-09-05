import type { StatutoryConfig } from "@prisma/client";

export type PFResult = {
  pfWageBase: number;
  employeeEPF: number;
  employerEPS: number;
  employerEPF: number;
  employerAdminCharges: number;
  employerEDLI: number;
  employerTotal: number;
};

const ADMIN_CHARGE_RATE = 0.005;
const ADMIN_CHARGE_MIN = 500;
const EDLI_RATE = 0.005;
const EDLI_MIN = 75;

/**
 * Computes monthly EPF/EPS split on the statutory PF wage base (capped at the wage ceiling —
 * see the plan's compliance note on Vivekananda Vidyamandir (2019) regarding what counts as
 * "basic wages"; this implementation caps at pfWageCeiling and expects Basic to already reflect
 * a CA-reviewed structure, it does not itself decide what allowances are PF-applicable).
 */
export function computePF(basicMonthly: number, config: StatutoryConfig): PFResult {
  const ceiling = Number(config.pfWageCeiling);
  const pfWageBase = Math.min(basicMonthly, ceiling);

  const employeeEPF = round2(pfWageBase * Number(config.pfEmployeeRate));

  const epsBase = Math.min(pfWageBase, Number(config.epsWageCeiling));
  const employerEPS = round2(epsBase * Number(config.epsRate));
  const employerTotalContribution = round2(pfWageBase * Number(config.pfEmployerRate));
  const employerEPF = round2(Math.max(employerTotalContribution - employerEPS, 0));

  const employerAdminCharges = round2(Math.max(pfWageBase * ADMIN_CHARGE_RATE, pfWageBase > 0 ? ADMIN_CHARGE_MIN : 0));
  const employerEDLI = round2(Math.max(pfWageBase * EDLI_RATE, pfWageBase > 0 ? EDLI_MIN : 0));

  return {
    pfWageBase,
    employeeEPF,
    employerEPS,
    employerEPF,
    employerAdminCharges,
    employerEDLI,
    employerTotal: round2(employerEPS + employerEPF + employerAdminCharges + employerEDLI),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
