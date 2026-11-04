import type { UserRole } from "../store/types";
import { isOverseer } from "../store/types";

export type PageId =
  | "reception"
  | "doctorDashboard"
  | "nursingStation"
  | "diagnosticLab"
  | "visitTrail"
  | "dashboard"
  | "billing"
  | "invoices"
  | "patients"
  | "doctors"
  | "inventory"
  | "purchases"
  | "grn"
  | "approvedGrn"
  | "salesReturn"
  | "returns"
  | "suppliers"
  | "reports"
  | "audit"
  | "users"
  | "settings"
  | "branches"
  | "privacy";

export interface RolePermissionConfig {
  label: string;
  badge: string;
  badgeClass: string;
  defaultHome: PageId;
  allowedPages: PageId[];
  canViewFinancials: boolean;
  canManageInventory: boolean;
  canRecordVitals: boolean;
  canWriteConsultations: boolean;
  canAccessLab: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  // Clinicians & Doctors: Interacts solely with clinical workflows, EHR, e-Prescriptions
  // Completely omits financial, billing, or inventory modules
  doctor: {
    label: "Attending Clinician (Doctor)",
    badge: "🩺 Doctor",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    defaultHome: "doctorDashboard",
    allowedPages: ["doctorDashboard", "visitTrail", "patients", "doctors", "diagnosticLab", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  // Nursing Staff: Interacts solely with vitals tracking and care plans
  // Completely omits financial, billing, or inventory modules
  nurse: {
    label: "Nursing Staff (RN)",
    badge: "🏥 Nurse",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    defaultHome: "nursingStation",
    allowedPages: ["nursingStation", "visitTrail", "patients", "doctors", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: true,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  // Receptionists: Front-desk operations and revenue cycle management
  // Register patients, demographic updates, appointments, admissions, discharges, invoices, and payments
  receptionist: {
    label: "Medical Receptionist (Front Desk)",
    badge: "🏢 Receptionist",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    defaultHome: "reception",
    allowedPages: ["reception", "billing", "invoices", "patients", "doctors", "visitTrail", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  // Staff Pharmacists: Accesses prescription fulfillment, pharmacy billing, and stock management
  staff_pharmacist: {
    label: "Staff Pharmacist",
    badge: "💊 Staff Pharmacist",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultHome: "billing",
    allowedPages: [
      "billing",
      "invoices",
      "inventory",
      "purchases",
      "salesReturn",
      "returns",
      "suppliers",
      "patients",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  // Admin Pharmacists: Pharmacy and operational management across hospital modules
  admin_pharmacist: {
    label: "Admin Pharmacist",
    badge: "🛡️ Admin Pharmacist",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard",
      "reception",
      "doctorDashboard",
      "nursingStation",
      "diagnosticLab",
      "visitTrail",
      "billing",
      "invoices",
      "patients",
      "doctors",
      "inventory",
      "purchases",
      "grn",
      "salesReturn",
      "returns",
      "suppliers",
      "reports",
      "audit",
      "users",
      "branches",
      "settings",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  // Pharmacy Personnel (legacy/alias for staff_pharmacist)
  // Omitted from clinical consultations, nursing notes, and lab reports
  pharmacist: {
    label: "Staff Pharmacist",
    badge: "💊 Staff Pharmacist",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultHome: "billing",
    allowedPages: [
      "billing",
      "invoices",
      "inventory",
      "purchases",
      "salesReturn",
      "returns",
      "suppliers",
      "patients",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  // Diagnostic Lab Technicians: Accesses test catalog, sample accessioning, result entry, lab reports
  lab_tech: {
    label: "Diagnostic Laboratory Specialist",
    badge: "🔬 Lab Tech",
    badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    defaultHome: "diagnosticLab",
    allowedPages: ["diagnosticLab", "patients", "visitTrail", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: true,
  },

  // General Staff: Configured operational staff (billing, inventory, reception)
  staff: {
    label: "Hospital Staff",
    badge: "👤 Staff",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    defaultHome: "reception",
    allowedPages: [
      "reception",
      "billing",
      "invoices",
      "inventory",
      "patients",
      "purchases",
      "salesReturn",
      "visitTrail",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  // Hospital Administrator: Operational management across all hospital modules
  admin: {
    label: "Hospital Administrator",
    badge: "🛡️ Admin",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard",
      "reception",
      "doctorDashboard",
      "nursingStation",
      "diagnosticLab",
      "visitTrail",
      "billing",
      "invoices",
      "patients",
      "doctors",
      "inventory",
      "purchases",
      "grn",
      "salesReturn",
      "returns",
      "suppliers",
      "reports",
      "audit",
      "users",
      "branches",
      "settings",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  // Superadmin & Developer: Full oversight, multi-branch, audit trail, system configuration
  superadmin: {
    label: "Super Administrator (Executive)",
    badge: "👑 Super Admin",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard",
      "reception",
      "doctorDashboard",
      "nursingStation",
      "diagnosticLab",
      "visitTrail",
      "billing",
      "invoices",
      "patients",
      "doctors",
      "inventory",
      "purchases",
      "grn",
      "approvedGrn",
      "salesReturn",
      "returns",
      "suppliers",
      "reports",
      "audit",
      "users",
      "branches",
      "settings",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  developer: {
    label: "System Architect (Developer)",
    badge: "⚡ Developer",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard",
      "reception",
      "doctorDashboard",
      "nursingStation",
      "diagnosticLab",
      "visitTrail",
      "billing",
      "invoices",
      "patients",
      "doctors",
      "inventory",
      "purchases",
      "grn",
      "approvedGrn",
      "salesReturn",
      "returns",
      "suppliers",
      "reports",
      "audit",
      "users",
      "branches",
      "settings",
      "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },
};

/**
 * Validates if the given role is permitted to view or navigate to the target page
 */
export function canAccessPage(role: UserRole | undefined, page: PageId): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  const cfg = ROLE_PERMISSIONS[role];
  if (!cfg) return false;
  return cfg.allowedPages.includes(page);
}

/**
 * Returns the default home workstation for a user based on their role
 */
export function getRoleHome(role: UserRole | undefined): PageId {
  if (!role) return "reception";
  const cfg = ROLE_PERMISSIONS[role];
  return cfg ? cfg.defaultHome : "reception";
}

/**
 * Check if the user is authorized to view financial / billing data
 */
export function canViewFinancials(role: UserRole | undefined): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  return !!ROLE_PERMISSIONS[role]?.canViewFinancials;
}

/**
 * Check if the user is authorized to manage medicine inventory & stock
 */
export function canManageInventory(role: UserRole | undefined): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  return !!ROLE_PERMISSIONS[role]?.canManageInventory;
}

/**
 * Returns the formatted display label and badge for the given role
 */
export function getRoleBadgeInfo(role: UserRole | undefined): { label: string; badge: string; badgeClass: string } {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return {
      label: "User",
      badge: "User",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }
  const cfg = ROLE_PERMISSIONS[role];
  return {
    label: cfg.label,
    badge: cfg.badge,
    badgeClass: cfg.badgeClass,
  };
}
