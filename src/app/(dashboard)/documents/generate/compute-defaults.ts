export type CandidateSource = {
  id: string;
  fullName: string;
  email: string;
  positionTitle: string;
  departmentName: string | null;
  offeredCtc: number | null;
  proposedJoiningDate: string | null;
};

export type EmployeeSource = {
  id: string;
  fullName: string;
  officialEmail: string | null;
  personalEmail: string | null;
  employeeCode: string;
  designationTitle: string;
  departmentName: string;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  reportingManagerName: string | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export type PfConfig = { employerRate: number; wageCeiling: number } | null;

/**
 * Splits a Total Annual CTC into Basic/HRA/Conveyance/Special Allowance plus Employer's PF
 * Contribution, matching the payroll module's own auto-split ratios (40/20/5/remainder on the
 * salary portion) and PF math (see src/lib/payroll/pf.ts) — but CTC here *includes* employer PF,
 * so the salary portion is solved backwards from the total rather than being the total itself.
 * Employer PF is capped once monthly Basic exceeds the statutory wage ceiling (currently ₹15,000),
 * which is true for nearly any real salary — the uncapped branch below only matters for very low CTC.
 */
export function splitCtcIntoComponents(
  ctcAnnual: number,
  pfConfig: PfConfig
): {
  basicAnnual: number;
  hraAnnual: number;
  conveyanceAnnual: number;
  specialAllowanceAnnual: number;
  employerPfAnnual: number;
} {
  const rate = pfConfig?.employerRate ?? 0;
  const ceilingMonthly = pfConfig?.wageCeiling ?? 0;

  let salaryPortion: number;
  let employerPfAnnual: number;

  if (!pfConfig) {
    salaryPortion = ctcAnnual;
    employerPfAnnual = 0;
  } else {
    // Assume Basic lands above the ceiling first (true for ~any real salary): PF is a fixed cap.
    const cappedEmployerPfAnnual = Math.round(ceilingMonthly * rate * 12);
    const basicMonthlyIfCapped = ((ctcAnnual - cappedEmployerPfAnnual) / 12) * 0.4;
    if (basicMonthlyIfCapped >= ceilingMonthly) {
      salaryPortion = ctcAnnual - cappedEmployerPfAnnual;
      employerPfAnnual = cappedEmployerPfAnnual;
    } else {
      // Low CTC: Basic stays under the ceiling, so PF scales with it — solve directly.
      salaryPortion = ctcAnnual / (1 + 0.4 * rate);
      const basicMonthly = (salaryPortion / 12) * 0.4;
      employerPfAnnual = Math.round(basicMonthly * rate * 12);
    }
  }

  const monthly = salaryPortion / 12;
  const basicMonthly = Math.round(monthly * 0.4);
  const hraMonthly = Math.round(monthly * 0.2);
  const conveyanceMonthly = Math.min(1600, Math.round(monthly * 0.05));
  const basicAnnual = basicMonthly * 12;
  const hraAnnual = hraMonthly * 12;
  const conveyanceAnnual = conveyanceMonthly * 12;
  // Special Allowance absorbs all rounding so the five components always sum to exactly ctcAnnual.
  const specialAllowanceAnnual = ctcAnnual - basicAnnual - hraAnnual - conveyanceAnnual - employerPfAnnual;

  return { basicAnnual, hraAnnual, conveyanceAnnual, specialAllowanceAnnual, employerPfAnnual };
}

export function computeDefaultValues(
  type: string,
  candidate: CandidateSource | null,
  employee: EmployeeSource | null,
  companyDefaults: { hrName: string; hrTitle: string; workLocation: string },
  pfConfig: PfConfig
): Record<string, string> {
  const base: Record<string, string> = {
    issueDate: todayISO(),
    hrName: companyDefaults.hrName,
    hrTitle: companyDefaults.hrTitle,
    workLocation: companyDefaults.workLocation,
  };

  if (type === "OFFER_LETTER" && candidate) {
    const split = candidate.offeredCtc ? splitCtcIntoComponents(candidate.offeredCtc, pfConfig) : null;
    return {
      ...base,
      candidateName: candidate.fullName,
      candidateFirstName: candidate.fullName.split(" ")[0],
      candidateAddress: "",
      positionTitle: candidate.positionTitle,
      department: candidate.departmentName ?? "",
      joiningDate: candidate.proposedJoiningDate ?? "",
      ctcAnnual: candidate.offeredCtc ? String(candidate.offeredCtc) : "",
      basicAnnual: split ? String(split.basicAnnual) : "",
      hraAnnual: split ? String(split.hraAnnual) : "",
      conveyanceAnnual: split ? String(split.conveyanceAnnual) : "",
      specialAllowanceAnnual: split ? String(split.specialAllowanceAnnual) : "",
      employerPfAnnual: split ? String(split.employerPfAnnual) : "",
      offerValidityDate: addDaysISO(7),
      noticePeriodDays: "30",
    };
  }
  if (type === "BACKGROUND_VERIFICATION_CONSENT" && candidate) {
    return {
      ...base,
      candidateName: candidate.fullName,
      positionTitle: candidate.positionTitle,
      verificationPartner: "the Company's HR team, or a third-party background verification partner engaged by the Company",
      retentionYears: "3",
      grievanceContact: "hr@altanontech.com",
    };
  }
  if (type === "INTERNSHIP_LETTER" && candidate) {
    return {
      ...base,
      candidateName: candidate.fullName,
      candidateFirstName: candidate.fullName.split(" ")[0],
      positionTitle: candidate.positionTitle,
      department: candidate.departmentName ?? "",
      startDate: candidate.proposedJoiningDate ?? "",
    };
  }
  if ((type === "RELIEVING_LETTER" || type === "EXPERIENCE_LETTER" || type === "APPOINTMENT_LETTER") && employee) {
    return {
      ...base,
      employeeName: employee.fullName,
      employeeFirstName: employee.fullName.split(" ")[0],
      employeeCode: employee.employeeCode,
      designation: employee.designationTitle,
      department: employee.departmentName,
      dateOfJoining: employee.dateOfJoining,
      dateOfLeaving: employee.dateOfLeaving ?? "",
      lastWorkingDay: employee.dateOfLeaving ?? "",
      reportingManagerName: employee.reportingManagerName ?? "",
    };
  }
  return base;
}
