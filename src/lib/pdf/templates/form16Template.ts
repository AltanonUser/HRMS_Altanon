import { formatINR } from "@/lib/utils/currency";

export type Form16TemplateInput = {
  employeeName: string;
  employeeCode: string;
  pan: string | null;
  designation: string;
  financialYear: string;
  regime: string;
  grossSalary: number;
  standardDeduction: number;
  taxableIncome: number;
  totalTdsDeducted: number;
};

export function buildForm16PartBHtml(input: Form16TemplateInput): string {
  return `
    <div class="disclaimer">
      <strong>This is a salary computation (Part B) for internal reference only.</strong>
      It is <strong>not</strong> a valid Form 16 under the Income Tax Act until combined with a genuine
      Part A certificate issued via the government's TRACES portal by an authorized deductor. Part A can
      only be generated after quarterly TDS returns (Form 24Q) are filed and tax is deposited under the
      Company's TAN — it cannot be produced by this or any private application.
    </div>

    <table class="kv" style="margin-top:16px;">
      <tr><td>Employee</td><td>${input.employeeName} (${input.employeeCode})</td></tr>
      <tr><td>Designation</td><td>${input.designation}</td></tr>
      <tr><td>PAN</td><td>${input.pan ?? "Not on file"}</td></tr>
      <tr><td>Financial Year</td><td>${input.financialYear}</td></tr>
      <tr><td>Tax Regime</td><td>${input.regime === "NEW" ? "New Regime" : "Old Regime"}</td></tr>
    </table>

    <table class="data" style="margin-top:16px;">
      <thead><tr><th>Particulars</th><th class="num">Amount</th></tr></thead>
      <tbody>
        <tr><td>Gross Salary Paid</td><td class="num">${formatINR(input.grossSalary)}</td></tr>
        <tr><td>Less: Standard Deduction</td><td class="num">${formatINR(input.standardDeduction)}</td></tr>
        <tr><td><strong>Taxable Income (estimated)</strong></td><td class="num"><strong>${formatINR(input.taxableIncome)}</strong></td></tr>
        <tr><td><strong>Total Tax Deducted at Source (TDS)</strong></td><td class="num"><strong>${formatINR(input.totalTdsDeducted)}</strong></td></tr>
      </tbody>
    </table>

    <p class="disclaimer" style="margin-top:16px;">
      This computation does not account for Section 80C/80D or other Chapter VI-A deductions, HRA
      exemption calculations, or income from other sources/employers. Consult your CA for a complete
      tax computation.
    </p>
  `;
}
