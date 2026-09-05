/**
 * Static content for the in-app user guide (/help). Read-only by design — there is deliberately
 * no edit UI for this; it's maintained here in code, not in the database, so it always reflects
 * what the app actually does rather than drifting out of sync.
 */

export type GuideSection = {
  id: string;
  title: string;
  icon: string; // lucide-react icon name
  whoFor: string;
  steps: string[];
  tip?: string;
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "LogIn",
    whoFor: "Everyone",
    steps: [
      "Go to the login page and sign in with the email and password given to you by HR.",
      "On your very first login, you'll be required to set a new password before you can do anything else — this is enforced automatically.",
      "Once in, the sidebar on the left only shows the sections you have permission to use. If something you expect is missing, ask a Super Admin or HR Admin to check your role.",
      "Your name, role, and company appear in the top-right corner — click it to sign out or change your password later.",
    ],
  },
  {
    id: "employees",
    title: "Managing Employees",
    icon: "Users",
    whoFor: "HR Admin, Super Admin",
    steps: [
      "Go to People → Employees to see everyone currently on staff.",
      "Click \"Add Employee\" to create a new record — you'll need their name, department, designation, date of joining, and reporting manager.",
      "Click into any employee's name to view their full profile, employment history, and the documents generated for them.",
      "Use the Edit button on an employee's profile to update department, designation, employment status, or bank/PAN details as things change.",
      "Managers can see their own team under People → My Team without needing full employee access.",
    ],
  },
  {
    id: "hierarchy",
    title: "Company Hierarchy & Departments",
    icon: "Network",
    whoFor: "HR Admin, Super Admin",
    steps: [
      "Go to People → Departments to create or edit departments and designations — this is the backbone of reporting structure and offer-letter defaults.",
      "Each employee's reporting manager is set on their profile; the chain of reporting managers is what drives the Org Chart.",
      "Go to People → Org Chart to see the whole company visually, grouped by department and reporting line — useful for sanity-checking the structure after adding new hires.",
    ],
  },
  {
    id: "candidates",
    title: "Candidates & Recruitment",
    icon: "UserPlus",
    whoFor: "HR Admin, Super Admin",
    steps: [
      "Go to People → Candidates and click \"Add Candidate\" to log someone you're in process with — name, email, position, department, and the CTC you're planning to offer.",
      "Update their status (Applied, Interviewing, Offered, Hired, Rejected) as they move through your pipeline — this list is what feeds the offer letter generator.",
      "Once you're ready to make an offer, use the \"Generate Document\" shortcut from the candidate's row to jump straight into an Offer Letter pre-filled with their details.",
    ],
  },
  {
    id: "documents",
    title: "Generating & Sending Documents",
    icon: "FileText",
    whoFor: "HR Admin, Super Admin",
    steps: [
      "Go to Documents → Generate Document and pick a letter type: Offer, Internship, Relieving, Experience, Appointment, or Background Verification Consent.",
      "Pick the candidate or employee it's for — most fields (name, department, dates) fill in automatically from their record; fill in the rest (CTC, joining date, etc.).",
      "For offer and appointment letters, use the \"Auto-split\" button in the Salary Structure section to break the total CTC into Basic/HRA/Conveyance/Special Allowance/Employer PF automatically — you can still hand-edit any component afterward, as long as they still add up to the total.",
      "Click \"Generate PDF\" to produce the branded, letterhead-formatted document — you'll land on its detail page where you can preview and download it.",
      "From that same page, click \"Send by Email\" to email it directly to the candidate or employee from the Company's official mailbox — this requires Microsoft 365 to be connected first (see Company Settings) and always asks for confirmation before sending.",
      "Go to Documents → All Documents any time to see everything ever generated, who it was for, and whether it's been sent.",
    ],
    tip: "Every generated document is a permanent record — if details were wrong, generate a fresh corrected one rather than trying to edit the PDF after the fact.",
  },
  {
    id: "salary-structures",
    title: "Payroll — Salary Structures",
    icon: "Wallet",
    whoFor: "Finance, HR Admin, Super Admin",
    steps: [
      "Go to Payroll → Salary Structures to define what an employee actually gets paid, month to month — this is separate from the CTC shown on their offer letter.",
      "Select the employee and enter the Annual CTC, then use Auto-split (same as in document generation) to get a starting Basic/HRA/Conveyance/Special Allowance breakdown, or enter it manually.",
      "A structure has an effective-from date — when someone gets a raise, add a new structure rather than editing the old one, so payslip history stays accurate.",
    ],
  },
  {
    id: "payroll-runs",
    title: "Payroll — Running Payroll",
    icon: "CalendarClock",
    whoFor: "Finance, Super Admin",
    steps: [
      "Go to Payroll → Payroll Runs and start a new run for the month you're processing.",
      "The system pulls every active employee's current salary structure, applies PF, Professional Tax, and TDS automatically based on the Statutory Config, and computes each payslip.",
      "Review the run before finalizing — once finalized, payslips become visible to employees under My Space → My Payslips.",
      "Individual payslip PDFs can be downloaded or emailed the same way documents are, from the payslip's own page.",
    ],
  },
  {
    id: "statutory",
    title: "Statutory Configuration",
    icon: "Landmark",
    whoFor: "Super Admin",
    steps: [
      "Go to Payroll → Statutory Config to see the PF rate/ceiling, Professional Tax slabs, and TDS settings the payroll engine uses — these are seeded with standard defaults per financial year.",
      "Update this only when the underlying law changes (a new financial year's slabs, a rate change) — it directly affects every future payslip calculation.",
    ],
    tip: "Have these figures reviewed by a CA before relying on them for a real payroll run — they're a reasonable starting point, not a substitute for professional sign-off.",
  },
  {
    id: "form16",
    title: "Form 16",
    icon: "ReceiptText",
    whoFor: "Finance, Super Admin",
    steps: [
      "Go to Payroll → Form 16 once a financial year's payroll runs are complete.",
      "Generate a Form 16 for an employee to get a computation summary (Part B style — salary breakup, deductions, tax computed) based on that year's payslips.",
      "Important: the genuine Form 16 Part A (with a TRACES-issued certificate number) can only come from the Income Tax Department's TRACES portal after your quarterly TDS returns are filed — this feature does not and cannot replace that. Treat what's generated here as a computation sheet to cross-check against, not the final statutory certificate.",
    ],
  },
  {
    id: "leave-attendance",
    title: "Leave & Attendance",
    icon: "CalendarCheck",
    whoFor: "Everyone (approvals: Managers, HR Admin)",
    steps: [
      "Any employee can apply for leave from My Space → My Leave, picking a leave type and date range.",
      "Managers and HR Admins approve or reject pending requests from Leave & Attendance → Leave Approvals.",
      "Attendance can be marked or reviewed under Leave & Attendance → Attendance.",
    ],
  },
  {
    id: "users-roles",
    title: "Users, Roles & Permissions",
    icon: "ShieldUser",
    whoFor: "Super Admin",
    steps: [
      "Go to Administration → Users to see every login account and create new ones — each new user is assigned a role at creation time, which determines exactly what they can see and do.",
      "Go to Administration → Roles & Permissions to see what each role (Super Admin, HR Admin, Manager, Finance, Employee) is allowed to do, permission by permission.",
      "A user account can optionally be linked to an Employee profile (so e.g. an employee can log in and see their own payslips) — this is set when the user is created.",
    ],
    tip: "Give people the least role that covers what they actually need to do — it's easy to grant more later, harder to walk back after they've had broad access for a while.",
  },
  {
    id: "company-settings",
    title: "Company Settings",
    icon: "Settings",
    whoFor: "Super Admin",
    steps: [
      "Go to Administration → Company Settings to update the registered address, CIN, signatory name/title, and official email shown on every generated letter and payslip.",
      "The company logo and the signatory's signature image are asset files, not something edited here directly — replacing them is a one-off setup task, not a routine one.",
    ],
  },
  {
    id: "my-space",
    title: "My Space (Every Employee)",
    icon: "User",
    whoFor: "Everyone",
    steps: [
      "My Profile shows your own employment details.",
      "My Payslips lists every finalized payslip you can download.",
      "My Documents shows any letters generated for you (offer, appointment, relieving, etc.).",
      "My Leave is where you apply for leave and track the status of past requests.",
    ],
  },
];
