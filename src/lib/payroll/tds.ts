import type { StatutoryConfig, TaxRegime } from "@prisma/client";

export type TaxSlab = { min: number; max: number | null; rate: number };

export type RegimeConfig = {
  slabs: TaxSlab[];
  standardDeduction: number;
  rebate87ATaxableLimit: number;
  rebate87AMaxAmount: number;
};

export type TDSConfig = {
  old: RegimeConfig;
  new: RegimeConfig;
  cessRate: number;
};

/**
 * SIMPLIFIED estimator (Section 192 average-rate method), NOT a full Income Tax computation.
 * Covers: regime slabs, standard deduction, Section 87A rebate, 4% health & education cess.
 * Does NOT cover: HRA exemption, Section 80C/80D/other Chapter VI-A deductions, marginal relief
 * near the rebate threshold, multiple-employer income, or any declaration-based adjustments.
 * This must be reviewed by a CA before use on real payroll — see the plan's compliance caveats.
 */
export function estimateAnnualTax(annualGrossSalary: number, regime: TaxRegime, config: StatutoryConfig): number {
  const tdsConfig = config.tdsConfigJson as unknown as TDSConfig;
  const regimeConfig = regime === "OLD" ? tdsConfig.old : tdsConfig.new;

  const taxableIncome = Math.max(annualGrossSalary - regimeConfig.standardDeduction, 0);

  let tax = 0;
  for (const slab of regimeConfig.slabs) {
    if (taxableIncome <= slab.min) continue;
    const upper = slab.max === null ? taxableIncome : Math.min(taxableIncome, slab.max);
    const taxableInSlab = Math.max(upper - slab.min, 0);
    tax += taxableInSlab * slab.rate;
  }

  if (taxableIncome <= regimeConfig.rebate87ATaxableLimit) {
    tax = Math.max(tax - regimeConfig.rebate87AMaxAmount, 0);
  }

  const cess = tax * tdsConfig.cessRate;
  return round2(tax + cess);
}

/** Average-rate monthly TDS: annual liability estimate divided evenly across 12 months. */
export function estimateMonthlyTDS(annualGrossSalary: number, regime: TaxRegime, config: StatutoryConfig): number {
  return round2(estimateAnnualTax(annualGrossSalary, regime, config) / 12);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const DEFAULT_TDS_CONFIG: TDSConfig = {
  old: {
    slabs: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 500000, rate: 0.05 },
      { min: 500000, max: 1000000, rate: 0.2 },
      { min: 1000000, max: null, rate: 0.3 },
    ],
    standardDeduction: 50000,
    rebate87ATaxableLimit: 500000,
    rebate87AMaxAmount: 12500,
  },
  new: {
    slabs: [
      { min: 0, max: 400000, rate: 0 },
      { min: 400000, max: 800000, rate: 0.05 },
      { min: 800000, max: 1200000, rate: 0.1 },
      { min: 1200000, max: 1600000, rate: 0.15 },
      { min: 1600000, max: 2000000, rate: 0.2 },
      { min: 2000000, max: 2400000, rate: 0.25 },
      { min: 2400000, max: null, rate: 0.3 },
    ],
    standardDeduction: 75000,
    rebate87ATaxableLimit: 1200000,
    rebate87AMaxAmount: 60000,
  },
  cessRate: 0.04,
};
