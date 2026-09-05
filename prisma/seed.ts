import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import {
  PERMISSION_GROUPS,
  SYSTEM_ROLES,
  ROLE_PERMISSIONS,
} from "../src/lib/rbac/permissions";
import { DEFAULT_MAHARASHTRA_PT_SLABS } from "../src/lib/payroll/professionalTax";
import { DEFAULT_TDS_CONFIG } from "../src/lib/payroll/tds";
import { COMPONENT_CODES } from "../src/lib/payroll/componentCodes";
import {
  OFFER_LETTER_HTML,
  INTERNSHIP_LETTER_HTML,
  RELIEVING_LETTER_HTML,
  EXPERIENCE_LETTER_HTML,
  APPOINTMENT_LETTER_HTML,
  BACKGROUND_VERIFICATION_CONSENT_HTML,
} from "../src/lib/pdf/templates/letterContents";

const prisma = new PrismaClient();

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  FINANCE: "Finance",
  EMPLOYEE: "Employee",
};

async function main() {
  console.log("Seeding permissions...");
  const permissionByCode = new Map<string, string>();
  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      const perm = await prisma.permission.upsert({
        where: { code: item.code },
        update: { module: group.module, label: item.label },
        create: { code: item.code, module: group.module, label: item.label },
      });
      permissionByCode.set(item.code, perm.id);
    }
  }

  console.log("Seeding roles...");
  const roleIdByName = new Map<string, string>();
  for (const roleName of Object.values(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { label: ROLE_LABELS[roleName] },
      create: { name: roleName, label: ROLE_LABELS[roleName], isSystemRole: true },
    });
    roleIdByName.set(roleName, role.id);

    const codes = ROLE_PERMISSIONS[roleName] ?? [];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: codes
        .map((code) => permissionByCode.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  console.log("Seeding company profile...");
  const existingProfile = await prisma.companyProfile.findFirst();
  if (!existingProfile) {
    await prisma.companyProfile.create({
      data: {
        legalName: "Altanon AI Works Private Limited",
        displayName: "Altanon AI Works",
        cin: "U62013PN2025PTC249195",
        registeredAddress:
          "416, Vardhaman Moonstone Buzz, Tathawade, Pune, Maharashtra, India, 411033",
        website: "https://altanontech.com",
        officialEmail: "hr@altanontech.com",
        logoPath: "/brand/logo.png",
        signatoryName: "Sandhya Nehe",
        signatoryTitle: "Director",
      },
    });
  }

  console.log("Seeding departments & designations...");
  await prisma.department.upsert({
    where: { code: "ENG" },
    update: {},
    create: { name: "Engineering", code: "ENG" },
  });
  await prisma.department.upsert({
    where: { code: "HR" },
    update: {},
    create: { name: "HR & Admin", code: "HR" },
  });
  await prisma.department.upsert({
    where: { code: "SALES" },
    update: {},
    create: { name: "Sales & Marketing", code: "SALES" },
  });
  await prisma.department.upsert({
    where: { code: "FIN" },
    update: {},
    create: { name: "Finance", code: "FIN" },
  });

  const designationTitles = [
    "Founder & Director",
    "HR Manager",
    "Software Engineer",
    "Senior Software Engineer",
    "Engineering Intern",
    "Sales Executive",
    "Finance Executive",
  ];
  const designationIdByTitle = new Map<string, string>();
  for (const title of designationTitles) {
    const d = await prisma.designation.upsert({ where: { title }, update: {}, create: { title } });
    designationIdByTitle.set(title, d.id);
  }

  console.log("Seeding salary component types...");
  const componentTypes: {
    code: string;
    label: string;
    category: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
    calculationType: "FIXED" | "PERCENT_OF_BASIC" | "FORMULA";
    isTaxable: boolean;
    isPfApplicable: boolean;
    sortOrder: number;
  }[] = [
    { code: COMPONENT_CODES.BASIC, label: "Basic", category: "EARNING", calculationType: "FIXED", isTaxable: true, isPfApplicable: true, sortOrder: 1 },
    { code: COMPONENT_CODES.HRA, label: "House Rent Allowance", category: "EARNING", calculationType: "FIXED", isTaxable: true, isPfApplicable: false, sortOrder: 2 },
    { code: COMPONENT_CODES.CONVEYANCE, label: "Conveyance Allowance", category: "EARNING", calculationType: "FIXED", isTaxable: true, isPfApplicable: false, sortOrder: 3 },
    { code: COMPONENT_CODES.SPECIAL_ALLOWANCE, label: "Special Allowance", category: "EARNING", calculationType: "FIXED", isTaxable: true, isPfApplicable: false, sortOrder: 4 },
    { code: COMPONENT_CODES.PF_EMPLOYEE, label: "Provident Fund (Employee)", category: "DEDUCTION", calculationType: "FORMULA", isTaxable: false, isPfApplicable: false, sortOrder: 10 },
    { code: COMPONENT_CODES.PROFESSIONAL_TAX, label: "Professional Tax", category: "DEDUCTION", calculationType: "FORMULA", isTaxable: false, isPfApplicable: false, sortOrder: 11 },
    { code: COMPONENT_CODES.TDS, label: "Income Tax (TDS)", category: "DEDUCTION", calculationType: "FORMULA", isTaxable: false, isPfApplicable: false, sortOrder: 12 },
    { code: COMPONENT_CODES.PF_EMPLOYER, label: "Provident Fund (Employer)", category: "EMPLOYER_CONTRIBUTION", calculationType: "FORMULA", isTaxable: false, isPfApplicable: false, sortOrder: 20 },
  ];
  for (const ct of componentTypes) {
    await prisma.salaryComponentType.upsert({ where: { code: ct.code }, update: ct, create: ct });
  }

  console.log("Seeding statutory config...");
  const financialYears = ["2025-26", "2026-27"];
  for (const fy of financialYears) {
    await prisma.statutoryConfig.upsert({
      where: { financialYear: fy },
      update: {},
      create: {
        financialYear: fy,
        pfEmployeeRate: 0.12,
        pfEmployerRate: 0.12,
        pfWageCeiling: 15000,
        epsRate: 0.0833,
        epsWageCeiling: 15000,
        esiEmployeeRate: 0.0075,
        esiEmployerRate: 0.0325,
        esiWageCeiling: 21000,
        ptSlabsJson: DEFAULT_MAHARASHTRA_PT_SLABS,
        standardDeduction: 75000,
        defaultRegime: "NEW",
        tdsConfigJson: DEFAULT_TDS_CONFIG,
        notes:
          "Seeded defaults based on FY2025-26 Budget changes. VERIFY every rate/slab with your CA before " +
          "running real payroll — these change with each Finance Act.",
      },
    });
  }

  console.log("Seeding leave types...");
  const leaveTypes = [
    { code: "CASUAL", label: "Casual Leave", accrualType: "MONTHLY" as const, accrualRate: 1, maxCarryForward: 6, isPaid: true },
    { code: "SICK", label: "Sick Leave", accrualType: "MONTHLY" as const, accrualRate: 0.5, maxCarryForward: 6, isPaid: true },
    { code: "EARNED", label: "Earned Leave", accrualType: "ANNUAL" as const, accrualRate: 15, maxCarryForward: 30, isPaid: true },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { code: lt.code }, update: lt, create: lt });
  }

  console.log("Seeding document templates...");
  const templates: { type: "OFFER_LETTER" | "INTERNSHIP_LETTER" | "RELIEVING_LETTER" | "EXPERIENCE_LETTER" | "APPOINTMENT_LETTER" | "BACKGROUND_VERIFICATION_CONSENT"; name: string; htmlBody: string }[] = [
    { type: "OFFER_LETTER", name: "Standard Offer Letter", htmlBody: OFFER_LETTER_HTML },
    { type: "INTERNSHIP_LETTER", name: "Standard Internship Letter", htmlBody: INTERNSHIP_LETTER_HTML },
    { type: "RELIEVING_LETTER", name: "Standard Relieving Letter", htmlBody: RELIEVING_LETTER_HTML },
    { type: "EXPERIENCE_LETTER", name: "Standard Experience Letter", htmlBody: EXPERIENCE_LETTER_HTML },
    { type: "APPOINTMENT_LETTER", name: "Standard Appointment Letter", htmlBody: APPOINTMENT_LETTER_HTML },
    { type: "BACKGROUND_VERIFICATION_CONSENT", name: "Standard Background Verification Consent", htmlBody: BACKGROUND_VERIFICATION_CONSENT_HTML },
  ];
  for (const t of templates) {
    const existing = await prisma.documentTemplate.findFirst({ where: { type: t.type, isActive: true } });
    if (!existing) {
      await prisma.documentTemplate.create({ data: { ...t, version: 1, isActive: true } });
    }
  }

  console.log("Seeding Super Admin user...");
  const superAdminRoleId = roleIdByName.get(SYSTEM_ROLES.SUPER_ADMIN)!;
  const adminEmail = "akashnehe1999@gmail.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    // Deliberately not linked to an Employee record — we don't have a verified name/designation
    // for this login. Create your own Employee profile under Employees and link it from Settings
    // > Users once seeded, if this account should represent a real person on staff.
    const tempPassword = "ChangeMe!12345";
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash(tempPassword, { type: argon2.argon2id }),
        roleId: superAdminRoleId,
        mustChangePassword: true,
      },
    });
    console.log(`\nSuper Admin created:\n  email:    ${adminEmail}\n  password: ${tempPassword}\n  (you'll be forced to change this on first login)\n`);
  } else {
    console.log(`Super Admin ${adminEmail} already exists — skipping.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
