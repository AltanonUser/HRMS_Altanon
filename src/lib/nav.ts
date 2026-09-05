import { PERMISSIONS, type PermissionCode } from "@/lib/rbac/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // lucide-react icon name, resolved in the sidebar component
  permission?: PermissionCode;
};

export type NavSection = { title: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "User Guide", href: "/help", icon: "BookOpen" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", href: "/employees", icon: "Users", permission: PERMISSIONS.EMPLOYEE_VIEW_ALL },
      { label: "My Team", href: "/employees?scope=team", icon: "UsersRound", permission: PERMISSIONS.EMPLOYEE_VIEW_TEAM },
      { label: "Candidates", href: "/candidates", icon: "UserPlus", permission: PERMISSIONS.CANDIDATE_VIEW },
      { label: "Org Chart", href: "/departments/org-chart", icon: "Network", permission: PERMISSIONS.EMPLOYEE_VIEW_ALL },
      { label: "Departments", href: "/departments", icon: "Building2", permission: PERMISSIONS.DEPARTMENT_MANAGE },
    ],
  },
  {
    title: "Documents",
    items: [
      { label: "Generate Document", href: "/documents/generate", icon: "FileText", permission: PERMISSIONS.DOCUMENT_GENERATE },
      { label: "All Documents", href: "/documents", icon: "Files", permission: PERMISSIONS.DOCUMENT_VIEW_ALL },
      { label: "Templates", href: "/documents/templates", icon: "FileCode", permission: PERMISSIONS.DOCUMENT_TEMPLATE_MANAGE },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Salary Structures", href: "/payroll/structures", icon: "Wallet", permission: PERMISSIONS.SALARY_STRUCTURE_MANAGE },
      { label: "Payroll Runs", href: "/payroll/runs", icon: "CalendarClock", permission: PERMISSIONS.PAYROLL_RUN_EXECUTE },
      { label: "Statutory Config", href: "/payroll/statutory", icon: "Landmark", permission: PERMISSIONS.STATUTORY_CONFIG_MANAGE },
      { label: "Form 16", href: "/form16", icon: "ReceiptText", permission: PERMISSIONS.FORM16_VIEW_ALL },
    ],
  },
  {
    title: "Leave & Attendance",
    items: [
      { label: "Leave Approvals", href: "/leave/approvals", icon: "CalendarCheck", permission: PERMISSIONS.LEAVE_APPROVE_TEAM },
      { label: "Attendance", href: "/attendance", icon: "Clock", permission: PERMISSIONS.ATTENDANCE_MANAGE },
    ],
  },
  {
    title: "My Space",
    items: [
      { label: "My Profile", href: "/me", icon: "User", permission: PERMISSIONS.EMPLOYEE_VIEW_OWN },
      { label: "My Payslips", href: "/me/payslips", icon: "IndianRupee", permission: PERMISSIONS.PAYSLIP_VIEW_OWN },
      { label: "My Documents", href: "/me/documents", icon: "FolderOpen", permission: PERMISSIONS.DOCUMENT_VIEW_OWN },
      { label: "My Leave", href: "/me/leave", icon: "CalendarDays", permission: PERMISSIONS.LEAVE_APPLY },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/settings/users", icon: "ShieldUser", permission: PERMISSIONS.USER_VIEW },
      { label: "Roles & Permissions", href: "/settings/roles", icon: "ShieldCheck", permission: PERMISSIONS.ROLE_MANAGE },
      { label: "Company Settings", href: "/settings/company", icon: "Settings", permission: PERMISSIONS.COMPANY_SETTINGS_MANAGE },
      { label: "Announcements", href: "/announcements", icon: "Megaphone", permission: PERMISSIONS.ANNOUNCEMENT_MANAGE },
      { label: "Audit Log", href: "/audit-log", icon: "History", permission: PERMISSIONS.AUDIT_LOG_VIEW },
    ],
  },
];
