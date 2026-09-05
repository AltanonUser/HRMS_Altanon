/**
 * Single source of truth for permission codes. Referenced by constant
 * everywhere (never string literals) so a rename is a one-place edit.
 * The seed script reads this list to populate the Permission table.
 */
export const PERMISSIONS = {
  // Users & roles
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DEACTIVATE: "user.deactivate",
  ROLE_MANAGE: "role.manage",

  // Employees
  EMPLOYEE_VIEW_ALL: "employee.view.all",
  EMPLOYEE_VIEW_TEAM: "employee.view.team",
  EMPLOYEE_VIEW_OWN: "employee.view.own",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_OFFBOARD: "employee.offboard",

  // Company hierarchy
  DEPARTMENT_MANAGE: "department.manage",
  DESIGNATION_MANAGE: "designation.manage",
  COMPANY_SETTINGS_MANAGE: "company.settings.manage",

  // Candidates
  CANDIDATE_VIEW: "candidate.view",
  CANDIDATE_CREATE: "candidate.create",
  CANDIDATE_UPDATE: "candidate.update",

  // Documents
  DOCUMENT_TEMPLATE_MANAGE: "document.template.manage",
  DOCUMENT_GENERATE: "document.generate",
  DOCUMENT_SEND: "document.send",
  DOCUMENT_VIEW_ALL: "document.view.all",
  DOCUMENT_VIEW_OWN: "document.view.own",
  VAULT_MANAGE: "vault.manage",

  // Payroll
  SALARY_STRUCTURE_MANAGE: "salary.structure.manage",
  PAYROLL_RUN_EXECUTE: "payroll.run.execute",
  PAYSLIP_VIEW_ALL: "payslip.view.all",
  PAYSLIP_VIEW_OWN: "payslip.view.own",
  STATUTORY_CONFIG_MANAGE: "statutory.config.manage",

  // Form 16
  FORM16_GENERATE: "form16.generate",
  FORM16_VIEW_ALL: "form16.view.all",
  FORM16_VIEW_OWN: "form16.view.own",

  // Leave & attendance
  LEAVE_APPLY: "leave.apply",
  LEAVE_APPROVE_TEAM: "leave.approve.team",
  LEAVE_VIEW_ALL: "leave.view.all",
  ATTENDANCE_MANAGE: "attendance.manage",
  ATTENDANCE_VIEW_OWN: "attendance.view.own",

  // Announcements
  ANNOUNCEMENT_MANAGE: "announcement.manage",

  // Audit
  AUDIT_LOG_VIEW: "audit.log.view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS: { module: string; items: { code: PermissionCode; label: string }[] }[] = [
  {
    module: "Users & Roles",
    items: [
      { code: PERMISSIONS.USER_VIEW, label: "View users" },
      { code: PERMISSIONS.USER_CREATE, label: "Create users" },
      { code: PERMISSIONS.USER_UPDATE, label: "Update users" },
      { code: PERMISSIONS.USER_DEACTIVATE, label: "Deactivate users" },
      { code: PERMISSIONS.ROLE_MANAGE, label: "Manage roles & permissions" },
    ],
  },
  {
    module: "Employees",
    items: [
      { code: PERMISSIONS.EMPLOYEE_VIEW_ALL, label: "View all employees" },
      { code: PERMISSIONS.EMPLOYEE_VIEW_TEAM, label: "View team (reports)" },
      { code: PERMISSIONS.EMPLOYEE_VIEW_OWN, label: "View own profile" },
      { code: PERMISSIONS.EMPLOYEE_CREATE, label: "Create employees" },
      { code: PERMISSIONS.EMPLOYEE_UPDATE, label: "Update employees" },
      { code: PERMISSIONS.EMPLOYEE_OFFBOARD, label: "Offboard employees" },
    ],
  },
  {
    module: "Company Hierarchy",
    items: [
      { code: PERMISSIONS.DEPARTMENT_MANAGE, label: "Manage departments" },
      { code: PERMISSIONS.DESIGNATION_MANAGE, label: "Manage designations" },
      { code: PERMISSIONS.COMPANY_SETTINGS_MANAGE, label: "Manage company settings" },
    ],
  },
  {
    module: "Candidates",
    items: [
      { code: PERMISSIONS.CANDIDATE_VIEW, label: "View candidates" },
      { code: PERMISSIONS.CANDIDATE_CREATE, label: "Create candidates" },
      { code: PERMISSIONS.CANDIDATE_UPDATE, label: "Update candidates" },
    ],
  },
  {
    module: "Documents",
    items: [
      { code: PERMISSIONS.DOCUMENT_TEMPLATE_MANAGE, label: "Manage document templates" },
      { code: PERMISSIONS.DOCUMENT_GENERATE, label: "Generate documents" },
      { code: PERMISSIONS.DOCUMENT_SEND, label: "Send documents by email" },
      { code: PERMISSIONS.DOCUMENT_VIEW_ALL, label: "View all generated documents" },
      { code: PERMISSIONS.DOCUMENT_VIEW_OWN, label: "View own documents" },
      { code: PERMISSIONS.VAULT_MANAGE, label: "Manage document vault" },
    ],
  },
  {
    module: "Payroll",
    items: [
      { code: PERMISSIONS.SALARY_STRUCTURE_MANAGE, label: "Manage salary structures" },
      { code: PERMISSIONS.PAYROLL_RUN_EXECUTE, label: "Run payroll" },
      { code: PERMISSIONS.PAYSLIP_VIEW_ALL, label: "View all payslips" },
      { code: PERMISSIONS.PAYSLIP_VIEW_OWN, label: "View own payslips" },
      { code: PERMISSIONS.STATUTORY_CONFIG_MANAGE, label: "Manage statutory config (PF/PT/TDS)" },
    ],
  },
  {
    module: "Form 16",
    items: [
      { code: PERMISSIONS.FORM16_GENERATE, label: "Generate Form 16" },
      { code: PERMISSIONS.FORM16_VIEW_ALL, label: "View all Form 16 records" },
      { code: PERMISSIONS.FORM16_VIEW_OWN, label: "View own Form 16" },
    ],
  },
  {
    module: "Leave & Attendance",
    items: [
      { code: PERMISSIONS.LEAVE_APPLY, label: "Apply for leave" },
      { code: PERMISSIONS.LEAVE_APPROVE_TEAM, label: "Approve team leave" },
      { code: PERMISSIONS.LEAVE_VIEW_ALL, label: "View all leave records" },
      { code: PERMISSIONS.ATTENDANCE_MANAGE, label: "Manage attendance" },
      { code: PERMISSIONS.ATTENDANCE_VIEW_OWN, label: "View own attendance" },
    ],
  },
  {
    module: "Other",
    items: [
      { code: PERMISSIONS.ANNOUNCEMENT_MANAGE, label: "Manage announcements" },
      { code: PERMISSIONS.AUDIT_LOG_VIEW, label: "View audit log" },
    ],
  },
];

export const ALL_PERMISSION_CODES: PermissionCode[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.code)
);

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  MANAGER: "MANAGER",
  FINANCE: "FINANCE",
  EMPLOYEE: "EMPLOYEE",
} as const;

export const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: ALL_PERMISSION_CODES,
  [SYSTEM_ROLES.HR_ADMIN]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DEACTIVATE,
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_OFFBOARD,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.DESIGNATION_MANAGE,
    PERMISSIONS.COMPANY_SETTINGS_MANAGE,
    PERMISSIONS.CANDIDATE_VIEW,
    PERMISSIONS.CANDIDATE_CREATE,
    PERMISSIONS.CANDIDATE_UPDATE,
    PERMISSIONS.DOCUMENT_TEMPLATE_MANAGE,
    PERMISSIONS.DOCUMENT_GENERATE,
    PERMISSIONS.DOCUMENT_SEND,
    PERMISSIONS.DOCUMENT_VIEW_ALL,
    PERMISSIONS.VAULT_MANAGE,
    PERMISSIONS.FORM16_VIEW_ALL,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.LEAVE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_MANAGE,
    PERMISSIONS.AUDIT_LOG_VIEW,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.PAYSLIP_VIEW_OWN,
    PERMISSIONS.FORM16_VIEW_OWN,
    PERMISSIONS.DOCUMENT_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
  ],
  [SYSTEM_ROLES.FINANCE]: [
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.SALARY_STRUCTURE_MANAGE,
    PERMISSIONS.PAYROLL_RUN_EXECUTE,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.STATUTORY_CONFIG_MANAGE,
    PERMISSIONS.FORM16_GENERATE,
    PERMISSIONS.FORM16_VIEW_ALL,
    PERMISSIONS.DOCUMENT_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.PAYSLIP_VIEW_OWN,
    PERMISSIONS.FORM16_VIEW_OWN,
    PERMISSIONS.DOCUMENT_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
  ],
  [SYSTEM_ROLES.MANAGER]: [
    PERMISSIONS.EMPLOYEE_VIEW_TEAM,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.PAYSLIP_VIEW_OWN,
    PERMISSIONS.FORM16_VIEW_OWN,
    PERMISSIONS.DOCUMENT_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
  ],
  [SYSTEM_ROLES.EMPLOYEE]: [
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.PAYSLIP_VIEW_OWN,
    PERMISSIONS.FORM16_VIEW_OWN,
    PERMISSIONS.DOCUMENT_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
  ],
};
