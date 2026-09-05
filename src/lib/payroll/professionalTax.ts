import type { StatutoryConfig } from "@prisma/client";

export type PTSlab = {
  minMonthly: number;
  maxMonthly: number | null;
  amount: number;
  februaryAmount: number;
};

export type PTSlabsConfig = {
  state: string;
  slabs: PTSlab[];
};

/**
 * Maharashtra Professional Tax is slab-based on monthly gross, with a well-known gotcha: the
 * top slab charges ₹200/month for 11 months and ₹300 in February, landing exactly on the ₹2,500/yr
 * statutory cap. A flat monthly rate under- or over-collects by year end — always use februaryAmount
 * for month === 2.
 */
export function computeProfessionalTax(grossMonthly: number, month1to12: number, config: StatutoryConfig): number {
  const ptConfig = config.ptSlabsJson as unknown as PTSlabsConfig;
  const slab = ptConfig.slabs.find(
    (s) => grossMonthly >= s.minMonthly && (s.maxMonthly === null || grossMonthly <= s.maxMonthly)
  );
  if (!slab) return 0;
  return month1to12 === 2 ? slab.februaryAmount : slab.amount;
}

export const DEFAULT_MAHARASHTRA_PT_SLABS: PTSlabsConfig = {
  state: "Maharashtra",
  slabs: [
    { minMonthly: 0, maxMonthly: 7500, amount: 0, februaryAmount: 0 },
    { minMonthly: 7501, maxMonthly: 10000, amount: 175, februaryAmount: 175 },
    { minMonthly: 10001, maxMonthly: null, amount: 200, februaryAmount: 300 },
  ],
};
