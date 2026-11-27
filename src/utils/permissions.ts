import type { UserRole, ErpModuleId } from "../store/types";
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
  | "privacy"
  // Seventeen ERP Module Pages
  | "patient"
  | "doctor"
  | "nurse"
  | "lab"
  | "pharmacy"
  | "cashier"
  | "maintenance"
  | "accounts"
  | "certificate"
  | "equipments"
  | "admin"
  | "physiotherapy"
  | "store"
  | "ambulance"
  | "skin";

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
  doctor: {
    label: "Attending Clinician (Doctor)",
    badge: "🩺 Doctor",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    defaultHome: "doctorDashboard",
    allowedPages: ["doctor", "doctorDashboard", "patient", "reception", "nurse", "nursingStation", "lab", "diagnosticLab", "skin", "visitTrail", "patients", "doctors", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  nurse: {
    label: "Nursing Staff (RN)",
    badge: "🏥 Nurse",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    defaultHome: "nursingStation",
    allowedPages: ["nurse", "nursingStation", "patient", "reception", "doctor", "doctorDashboard", "visitTrail", "patients", "doctors", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: true,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  receptionist: {
    label: "Medical Receptionist (Front Desk)",
    badge: "🏢 Receptionist",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    defaultHome: "reception",
    allowedPages: ["patient", "reception", "cashier", "certificate", "ambulance", "pharmacy", "billing", "invoices", "patients", "doctors", "visitTrail", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  staff_pharmacist: {
    label: "Staff Pharmacist",
    badge: "💊 Staff Pharmacist",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultHome: "billing",
    allowedPages: [
      "pharmacy",
      "store",
      "billing",
      "invoices",
      "inventory",
      "purchases",
      "grn",
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

  admin_pharmacist: {
    label: "Admin Pharmacist",
    badge: "🛡️ Admin Pharmacist",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard", "reception", "doctorDashboard", "nursingStation", "diagnosticLab",
      "visitTrail", "billing", "invoices", "patients", "doctors", "inventory",
      "purchases", "grn", "salesReturn", "returns", "suppliers", "reports",
      "audit", "users", "branches", "settings", "privacy",
      "patient", "doctor", "nurse", "lab", "pharmacy", "cashier", "maintenance",
      "accounts", "certificate", "equipments", "admin", "physiotherapy", "store",
      "ambulance", "skin",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  pharmacist: {
    label: "Staff Pharmacist",
    badge: "💊 Staff Pharmacist",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultHome: "billing",
    allowedPages: [
      "pharmacy", "store", "billing", "invoices", "inventory",
      "purchases", "grn", "salesReturn", "returns", "suppliers", "patients", "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  lab_tech: {
    label: "Diagnostic Laboratory Specialist",
    badge: "🔬 Lab Tech",
    badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    defaultHome: "lab",
    allowedPages: ["lab", "diagnosticLab", "patients", "visitTrail", "privacy"],
    canViewFinancials: false,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: true,
  },

  staff: {
    label: "Hospital Staff",
    badge: "👤 Staff",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    defaultHome: "reception",
    allowedPages: [
      "patient", "reception", "pharmacy", "cashier", "billing", "invoices",
      "inventory", "patients", "purchases", "salesReturn", "visitTrail", "privacy",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  cashier: {
    label: "Hospital Cashier",
    badge: "💵 Cashier",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    defaultHome: "cashier",
    allowedPages: ["cashier", "patient", "reception", "billing", "invoices", "patients", "accounts", "reports", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  accountant: {
    label: "Chief Accountant",
    badge: "📊 Accounts",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    defaultHome: "accounts",
    allowedPages: ["accounts", "cashier", "reports", "invoices", "billing", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  maintenance: {
    label: "Biomedical & Facility Engineer",
    badge: "🔧 Maintenance",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultHome: "maintenance",
    allowedPages: ["maintenance", "equipments", "privacy"],
    canViewFinancials: false,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  physiotherapy: {
    label: "Physiotherapist / Rehab Specialist",
    badge: "🏃 Physiotherapy",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    defaultHome: "physiotherapy",
    allowedPages: ["physiotherapy", "patient", "reception", "patients", "billing", "visitTrail", "privacy"],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  store_manager: {
    label: "Central Store Manager",
    badge: "📦 Store",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    defaultHome: "store",
    allowedPages: ["store", "pharmacy", "billing", "inventory", "purchases", "grn", "suppliers", "privacy"],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  ambulance: {
    label: "Ambulance Services & Fleet",
    badge: "🚑 Ambulance",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800",
    defaultHome: "ambulance",
    allowedPages: ["ambulance", "patient", "reception", "patients", "billing", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: false,
    canAccessLab: false,
  },

  skin_specialist: {
    label: "Dermatologist (Skin Clinic)",
    badge: "✨ Skin Clinic",
    badgeClass: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    defaultHome: "skin",
    allowedPages: ["skin", "patient", "reception", "doctor", "doctorDashboard", "patients", "doctors", "billing", "visitTrail", "privacy"],
    canViewFinancials: true,
    canManageInventory: false,
    canRecordVitals: false,
    canWriteConsultations: true,
    canAccessLab: false,
  },

  admin: {
    label: "Hospital Administrator",
    badge: "🛡️ Admin",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    defaultHome: "admin",
    allowedPages: [
      "dashboard", "reception", "doctorDashboard", "nursingStation", "diagnosticLab",
      "visitTrail", "billing", "invoices", "patients", "doctors", "inventory",
      "purchases", "grn", "salesReturn", "returns", "suppliers", "reports",
      "audit", "users", "branches", "settings", "privacy",
      "patient", "doctor", "nurse", "lab", "pharmacy", "cashier", "maintenance",
      "accounts", "certificate", "equipments", "admin", "physiotherapy", "store",
      "ambulance", "skin",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },

  superadmin: {
    label: "Super Administrator (Executive)",
    badge: "👑 Super Admin",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    defaultHome: "dashboard",
    allowedPages: [
      "dashboard", "reception", "doctorDashboard", "nursingStation", "diagnosticLab",
      "visitTrail", "billing", "invoices", "patients", "doctors", "inventory",
      "purchases", "grn", "approvedGrn", "salesReturn", "returns", "suppliers", "reports",
      "audit", "users", "branches", "settings", "privacy",
      "patient", "doctor", "nurse", "lab", "pharmacy", "cashier", "maintenance",
      "accounts", "certificate", "equipments", "admin", "physiotherapy", "store",
      "ambulance", "skin",
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
      "dashboard", "reception", "doctorDashboard", "nursingStation", "diagnosticLab",
      "visitTrail", "billing", "invoices", "patients", "doctors", "inventory",
      "purchases", "grn", "approvedGrn", "salesReturn", "returns", "suppliers", "reports",
      "audit", "users", "branches", "settings", "privacy",
      "patient", "doctor", "nurse", "lab", "pharmacy", "cashier", "maintenance",
      "accounts", "certificate", "equipments", "admin", "physiotherapy", "store",
      "ambulance", "skin",
    ],
    canViewFinancials: true,
    canManageInventory: true,
    canRecordVitals: true,
    canWriteConsultations: true,
    canAccessLab: true,
  },
};

export function canAccessPage(role: UserRole | undefined, page: PageId): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  const cfg = ROLE_PERMISSIONS[role];
  if (!cfg) return false;
  return cfg.allowedPages.includes(page);
}

export function getRoleHome(role: UserRole | undefined): PageId {
  if (!role) return "reception";
  const cfg = ROLE_PERMISSIONS[role];
  return cfg ? cfg.defaultHome : "reception";
}

export function canViewFinancials(role: UserRole | undefined): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  return !!ROLE_PERMISSIONS[role]?.canViewFinancials;
}

export function canManageInventory(role: UserRole | undefined): boolean {
  if (!role) return false;
  if (isOverseer(role)) return true;
  return !!ROLE_PERMISSIONS[role]?.canManageInventory;
}

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

export function canAccessModule(role: UserRole | undefined, moduleId: ErpModuleId): boolean {
  if (!role) return false;
  if (isOverseer(role) || role === "admin" || role === "admin_pharmacist") return true;

  switch (role) {
    case "doctor":
      return ["doctor", "patient", "nurse", "lab", "skin"].includes(moduleId);
    case "nurse":
      return ["nurse", "patient", "doctor"].includes(moduleId);
    case "receptionist":
      return ["patient", "cashier", "certificate", "ambulance", "pharmacy"].includes(moduleId);
    case "lab_tech":
      return ["lab"].includes(moduleId);
    case "staff_pharmacist":
    case "pharmacist":
      return ["pharmacy", "store"].includes(moduleId);
    case "cashier":
      return ["cashier", "accounts", "reports", "patient"].includes(moduleId);
    case "accountant":
      return ["accounts", "cashier", "reports"].includes(moduleId);
    case "maintenance":
      return ["maintenance", "equipments"].includes(moduleId);
    case "physiotherapy":
      return ["physiotherapy", "patient"].includes(moduleId);
    case "store_manager":
      return ["store", "pharmacy"].includes(moduleId);
    case "ambulance":
      return ["ambulance", "patient"].includes(moduleId);
    case "skin_specialist":
      return ["skin", "patient", "doctor"].includes(moduleId);
    case "staff":
      return ["patient", "pharmacy", "cashier"].includes(moduleId);
    default:
      return false;
  }
}

export function getRoleDefaultModule(role: UserRole | undefined): ErpModuleId {
  if (!role) return "patient";
  switch (role) {
    case "doctor":
      return "doctor";
    case "nurse":
      return "nurse";
    case "receptionist":
      return "patient";
    case "lab_tech":
      return "lab";
    case "staff_pharmacist":
    case "pharmacist":
      return "pharmacy";
    case "cashier":
      return "cashier";
    case "accountant":
      return "accounts";
    case "maintenance":
      return "maintenance";
    case "physiotherapy":
      return "physiotherapy";
    case "store_manager":
      return "store";
    case "ambulance":
      return "ambulance";
    case "skin_specialist":
      return "skin";
    case "admin":
      return "admin";
    case "superadmin":
    case "developer":
    case "admin_pharmacist":
      return "dashboard";
    default:
      return "patient";
  }
}
