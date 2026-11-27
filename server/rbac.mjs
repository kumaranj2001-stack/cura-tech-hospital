/**
 * Role-Based Access Control (RBAC) Module for Cura-Tech Hospital Management System
 *
 * Regulates system access and API routing across all 17 functional hospital roles.
 */

export const HOSPITAL_ROLES = {
  DEVELOPER: "developer",
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  ADMIN_PHARMACIST: "admin_pharmacist",
  RECEPTIONIST: "receptionist",
  NURSE: "nurse",
  DOCTOR: "doctor",
  LAB_TECH: "lab_tech",
  STAFF_PHARMACIST: "staff_pharmacist",
  PHARMACIST: "pharmacist",
  STAFF: "staff",
  CASHIER: "cashier",
  ACCOUNTANT: "accountant",
  MAINTENANCE: "maintenance",
  PHYSIOTHERAPY: "physiotherapy",
  STORE_MANAGER: "store_manager",
  AMBULANCE: "ambulance",
  SKIN_SPECIALIST: "skin_specialist",
};

/**
 * Checks if a route path is public and does not require role enforcement.
 */
export function isPublicPath(pathname) {
  if (
    pathname === "/" ||
    pathname === "/api/health" ||
    pathname === "/api/firebase/status" ||
    pathname === "/api/realtime/status" ||
    pathname === "/ws" ||
    pathname === "/api/ws" ||
    pathname.startsWith("/api/auth/")
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes role string for comparison
 */
export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

/**
 * Validates whether a specific role is authorized for a method and pathname.
 */
export function isRoleAuthorized(role, method, pathname) {
  const r = normalizeRole(role);
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "");

  // 1. Developer: Unrestricted authority across all endpoints
  if (r === HOSPITAL_ROLES.DEVELOPER) {
    return true;
  }

  // 2. Super Admin: Unrestricted authority over all operational, clinical, user, and financial endpoints
  if (r === HOSPITAL_ROLES.SUPERADMIN) {
    return true;
  }

  // 3. Admin & Admin Pharmacist: Administrative oversight across hospital modules
  if (r === HOSPITAL_ROLES.ADMIN || r === HOSPITAL_ROLES.ADMIN_PHARMACIST) {
    if (path.startsWith("/api/system/purge") || path.startsWith("/api/data/purge")) {
      return false;
    }
    if (path.startsWith("/api/grn/approved") && (m === "PUT" || m === "DELETE")) {
      return false;
    }
    return true;
  }

  // 4. Receptionist: Front-desk, patient registration/demographics, invoices, admissions, certificates, ambulance dispatch
  if (r === HOSPITAL_ROLES.RECEPTIONIST) {
    if (path === "/api/patients" || path === "/api/patients/create" || path.startsWith("/api/patients/update")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path.startsWith("/api/patients/") && m !== "DELETE") {
      return true;
    }
    if (path === "/api/admissions" || path === "/api/admissions/create" || path.startsWith("/api/admissions/")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path === "/api/invoices" || path === "/api/invoices/create") {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/billing/calculate" || path === "/api/invoices/calculate") {
      return m === "POST";
    }
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }
    if (path.startsWith("/api/certificates") || path.startsWith("/api/ambulance") || path.startsWith("/api/cashier")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 5. Nurse: Inpatient and outpatient care coordination, vitals, nursing notes
  if (r === HOSPITAL_ROLES.NURSE) {
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/admissions" || (path.startsWith("/api/admissions/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/inventory/medicines" || path === "/api/medicines") {
      return m === "GET";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 6. Doctor: Clinical authority, medical histories, consultations, lab orders, skin clinic, certificates
  if (r === HOSPITAL_ROLES.DOCTOR) {
    if (path === "/api/patients" || path.startsWith("/api/patients/")) {
      return m === "GET" || m === "PUT";
    }
    if (path === "/api/admissions" || path.startsWith("/api/admissions/")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }
    if (
      path === "/api/inventory/medicines" ||
      path === "/api/medicines" ||
      path === "/api/inventory/narcotic" ||
      path === "/api/inventory/filter"
    ) {
      return m === "GET" || m === "POST";
    }
    if (path.startsWith("/api/lab") || path.startsWith("/api/skin") || path.startsWith("/api/certificates")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 7. Lab Technician: Diagnostics management, test queues, reagent stock, external labs, test catalog
  if (r === HOSPITAL_ROLES.LAB_TECH) {
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/doctors" || path === "/api/doctors/list") {
      return m === "GET" || m === "POST";
    }
    if (path.startsWith("/api/lab")) {
      return true;
    }
    if (path.startsWith("/api/reports") && m === "GET") {
      return true;
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 8. Staff Pharmacist / Pharmacist: Dispensing, stock, GRN, billing, store view
  if (r === HOSPITAL_ROLES.STAFF_PHARMACIST || r === HOSPITAL_ROLES.PHARMACIST || r === HOSPITAL_ROLES.STAFF) {
    if (path === "/api/invoices" || path === "/api/invoices/create") {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/billing/calculate" || path === "/api/invoices/calculate") {
      return m === "POST";
    }
    if (path.startsWith("/api/inventory") || path.startsWith("/api/medicines")) {
      if (m === "DELETE" || path.includes("/min-stock") || path === "/api/inventory/settings") {
        return false;
      }
      return true;
    }
    if (path === "/api/parse-invoice") {
      return m === "POST";
    }
    if (path === "/api/suppliers") {
      return m === "GET";
    }
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/doctors" || path === "/api/doctors/list") {
      return m === "GET" || m === "POST";
    }
    if (path.startsWith("/api/store")) {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 9. Hospital Cashier: Point of sale, bill settlement, pre-booking ledgers, cash close, reports
  if (r === HOSPITAL_ROLES.CASHIER) {
    if (
      path.startsWith("/api/cashier") ||
      path.startsWith("/api/invoices") ||
      path.startsWith("/api/billing") ||
      path.startsWith("/api/cash-close")
    ) {
      return true;
    }
    if (path.startsWith("/api/accounts") && m === "GET") {
      return true;
    }
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path.startsWith("/api/reports")) {
      return m === "GET";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 10. Chief Accountant: Financial audits, expense vouchers, receivables aging, cash close, reports
  if (r === HOSPITAL_ROLES.ACCOUNTANT) {
    if (
      path.startsWith("/api/accounts") ||
      path.startsWith("/api/cash-close") ||
      path.startsWith("/api/reports") ||
      (path.startsWith("/api/cashier") && m === "GET")
    ) {
      return true;
    }
    if (path.startsWith("/api/invoices") && m === "GET") {
      return true;
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 11. Maintenance & Biomedical Engineer: Work orders, facility checks, equipment service
  if (r === HOSPITAL_ROLES.MAINTENANCE) {
    if (path.startsWith("/api/equipments") || path.startsWith("/api/maintenance") || path.startsWith("/api/facility")) {
      return true;
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 12. Physiotherapy Specialist: Physical therapy items, rehabilitation sales POS, patient list
  if (r === HOSPITAL_ROLES.PHYSIOTHERAPY) {
    if (path.startsWith("/api/physiotherapy") || path.startsWith("/api/invoices")) {
      return true;
    }
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 13. Central Store Manager: Store inventory, stock indents, supplier shipments
  if (r === HOSPITAL_ROLES.STORE_MANAGER) {
    if (path.startsWith("/api/store") || path.startsWith("/api/inventory") || path.startsWith("/api/suppliers") || path.startsWith("/api/purchases")) {
      return true;
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 14. Ambulance Fleet: Fleet dispatch, trip logs, trauma services
  if (r === HOSPITAL_ROLES.AMBULANCE) {
    if (path.startsWith("/api/ambulance") || path.startsWith("/api/invoices")) {
      return true;
    }
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  // 15. Skin Specialist: Dermatology consultations, laser therapy logs, topical prescriptions
  if (r === HOSPITAL_ROLES.SKIN_SPECIALIST) {
    if (path.startsWith("/api/skin") || path.startsWith("/api/consultations") || path.startsWith("/api/prescriptions")) {
      return true;
    }
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/doctors" || (path.startsWith("/api/doctors/") && m === "GET")) {
      return m === "GET";
    }
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }
    return false;
  }

  return false;
}

/**
 * Enforces Role-Based Access Control on incoming HTTP requests.
 */
export function enforceRbac(req, res) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname;

  if (isPublicPath(pathname)) {
    return true;
  }

  const roleHeader = req.headers["x-user-role"];
  const roleQuery = url.searchParams.get("role");
  const authHeader = req.headers["authorization"];

  let role = roleHeader || roleQuery || "";
  if (!role && authHeader && authHeader.toLowerCase().startsWith("role ")) {
    role = authHeader.slice(5);
  }

  const normalized = normalizeRole(role);

  if (!normalized) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-user-role");
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Authentication Required: User role credential ('x-user-role' header) was not provided.",
      })
    );
    return false;
  }

  const authorized = isRoleAuthorized(normalized, req.method, pathname);
  if (!authorized) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-user-role");
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: `Access Denied: Role '${normalized}' is not authorized to perform ${req.method} on ${pathname}.`,
      })
    );
    return false;
  }

  return true;
}
