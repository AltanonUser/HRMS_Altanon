import { formatINR, amountInWords } from "@/lib/utils/currency";
import { MONTH_NAMES } from "@/lib/utils/dates";

export type PayslipTemplateInput = {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  month: number;
  year: number;
  daysInMonth: number;
  daysPaid: number;
  bankName?: string | null;
  bankAccountMasked?: string | null;
  panMasked?: string | null;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
};

export function buildPayslipHtml(input: PayslipTemplateInput): string {
  const earningsRows = input.earnings
    .map((e) => `<tr><td>${e.label}</td><td class="num">${formatINR(e.amount)}</td></tr>`)
    .join("");
  const deductionRows = input.deductions
    .map((d) => `<tr><td>${d.label}</td><td class="num">${formatINR(d.amount)}</td></tr>`)
    .join("");

  return `
    <table class="kv">
      <tr><td>Employee</td><td>${input.employeeName} (${input.employeeCode})</td></tr>
      <tr><td>Designation</td><td>${input.designation}</td></tr>
      <tr><td>Department</td><td>${input.department}</td></tr>
      <tr><td>Pay Period</td><td>${MONTH_NAMES[input.month - 1]} ${input.year}</td></tr>
      <tr><td>Days Paid</td><td>${input.daysPaid} / ${input.daysInMonth}</td></tr>
      ${input.bankName ? `<tr><td>Bank</td><td>${input.bankName}${input.bankAccountMasked ? ` — ${input.bankAccountMasked}` : ""}</td></tr>` : ""}
      ${input.panMasked ? `<tr><td>PAN</td><td>${input.panMasked}</td></tr>` : ""}
    </table>

    <div style="display:flex; gap:16px; margin-top:16px;">
      <table class="data" style="flex:1;">
        <thead><tr><th>Earnings</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${earningsRows}
          <tr><td><strong>Gross Earnings</strong></td><td class="num"><strong>${formatINR(input.grossEarnings)}</strong></td></tr>
        </tbody>
      </table>
      <table class="data" style="flex:1;">
        <thead><tr><th>Deductions</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${deductionRows}
          <tr><td><strong>Total Deductions</strong></td><td class="num"><strong>${formatINR(input.totalDeductions)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <table class="kv" style="margin-top:16px;">
      <tr><td>Net Pay</td><td><strong>${formatINR(input.netPay)}</strong></td></tr>
      <tr><td>Net Pay in Words</td><td>${amountInWords(input.netPay)}</td></tr>
    </table>

    <p class="disclaimer">This is a computer-generated payslip and does not require a signature.</p>
  `;
}
