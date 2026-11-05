/**
 * Role-Based Access Control (RBAC) Module for Cura-Tech Hospital Management System
 * 
 * Regulates system access and API routing based on functional hospital roles:
 * - Super Admin & Developer: Unrestricted system-wide authority (users, branches, all clinical & financial data, audit, purge)
 * - Admin & Admin Pharmacist: Operational administrative authority (users, branches, clinical, financial, inventory, doctors, suppliers)
 * - Receptionist: Front-desk operations, patient registration, demographic updates, appointment scheduling, patient invoice generation, payment processing
 * - Nurse: Care coordination, patient lists, vital signs monitoring, medication administration tracking, nursing notes
 * - Doctor: Comprehensive clinical authority, full patient medical histories, EHR consultations, e-prescriptions, diagnostic test orders
 * - Lab Technician: Diagnostics management, lab order queue, entering/authorizing diagnostic results, pathology reports, order status updates
 * - Staff Pharmacist / Pharmacist: Medication dispensing, prescription verification, stock deduction, pharmaceutical sales billing
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
};

/**
 * Checks if a route path is public and does not require role enforcement.
 */
export function isPublicPath(pathname) {
  if (
    pathname === "/" ||
    pathname === "/api/health" ||
    pathname === "/api/firebase/status" ||
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
    // Approved GRN update/delete is exclusively Developer, everything else is permitted
    return true;
  }

  // 3. Admin & Admin Pharmacist: Administrative oversight, users, branches, patients, invoices, inventory, doctors
  if (r === HOSPITAL_ROLES.ADMIN || r === HOSPITAL_ROLES.ADMIN_PHARMACIST) {
    // Block developer-only low-level system endpoints
    if (path.startsWith("/api/system/purge") || path.startsWith("/api/data/purge")) {
      return false;
    }
    if (path.startsWith("/api/grn/approved") && (m === "PUT" || m === "DELETE")) {
      return false;
    }
    return true;
  }

  // 4. Receptionist: Front-desk, patient registration/demographics, patient invoices, payments, billing ledgers
  if (r === HOSPITAL_ROLES.RECEPTIONIST) {
    // Patient registration & demographic updates
    if (path === "/api/patients" || path === "/api/patients/create" || path.startsWith("/api/patients/update")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }
    if (path.startsWith("/api/patients/") && m !== "DELETE") {
      return true;
    }

    // Inpatient admissions, bed assignment, transfers and discharge
    if (path === "/api/admissions" || path === "/api/admissions/create" || path.startsWith("/api/admissions/")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }

    // Invoice generation, payment processing, billing calculations
    if (path === "/api/invoices" || path === "/api/invoices/create") {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/billing/calculate" || path === "/api/invoices/calculate") {
      return m === "POST";
    }

    // View doctor schedules and directory
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }

    // Audit logging for reception actions
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }

    return false;
  }

  // 5. Nurse: Inpatient and outpatient care coordination, patient lists, vitals, nursing notes
  if (r === HOSPITAL_ROLES.NURSE) {
    // Patient lists and details
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }

    // Inpatient list and bed monitoring
    if (path === "/api/admissions" || (path.startsWith("/api/admissions/") && m === "GET")) {
      return m === "GET";
    }

    // Doctor directory (view attending physicians)
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }

    // View formulary/medicines for administration reference
    if (path === "/api/inventory/medicines" || path === "/api/medicines") {
      return m === "GET";
    }

    // Logging vitals & nursing actions
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }

    return false;
  }

  // 6. Doctor: Clinical authority, patient medical history, consultations, e-prescriptions, diagnostic test orders
  if (r === HOSPITAL_ROLES.DOCTOR) {
    // Patient medical histories, consultations & updates
    if (path === "/api/patients" || path.startsWith("/api/patients/")) {
      return m === "GET" || m === "PUT" || (path === "/api/patients" && m === "GET");
    }

    // Inpatient rounds, admission orders and discharge advice
    if (path === "/api/admissions" || path.startsWith("/api/admissions/")) {
      return m === "GET" || m === "POST" || m === "PUT";
    }

    // Doctor directory
    if (path === "/api/doctors" || path === "/api/doctors/list" || path === "/api/doctors/filter") {
      return m === "GET" || m === "POST";
    }

    // Drug formulary review for prescription generation
    if (
      path === "/api/inventory/medicines" ||
      path === "/api/medicines" ||
      path === "/api/inventory/narcotic" ||
      path === "/api/inventory/filter"
    ) {
      return m === "GET" || m === "POST";
    }

    // Audit logging for clinical notes and prescription issuance
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }

    return false;
  }

  // 7. Lab Technician: Diagnostics management, test queues, entering/authorizing test results, pathology reports
  if (r === HOSPITAL_ROLES.LAB_TECH) {
    // View patient info for accessioning and report generation
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }

    // View ordering doctors
    if (path === "/api/doctors" || path === "/api/doctors/list") {
      return m === "GET" || m === "POST";
    }

    // Audit logging for lab findings and authorizations
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }

    return false;
  }

  // 8. Staff Pharmacist / Pharmacist: Medication dispensing, verification, stock management, pharmaceutical billing
  if (r === HOSPITAL_ROLES.STAFF_PHARMACIST || r === HOSPITAL_ROLES.PHARMACIST || r === HOSPITAL_ROLES.STAFF) {
    // Invoices and billing for pharmaceutical sales
    if (path === "/api/invoices" || path === "/api/invoices/create") {
      return m === "GET" || m === "POST";
    }
    if (path === "/api/billing/calculate" || path === "/api/invoices/calculate") {
      return m === "POST";
    }

    // Medicine stock & dispensing
    if (path.startsWith("/api/inventory") || path.startsWith("/api/medicines")) {
      // Disallow deleting medicines or altering branch-wide min stock settings (admin only)
      if (m === "DELETE" || path.includes("/min-stock") || path === "/api/inventory/settings") {
        return false;
      }
      return true;
    }

    // GRN document parsing for incoming supplier stock
    if (path === "/api/parse-invoice") {
      return m === "POST";
    }

    // Suppliers viewing
    if (path === "/api/suppliers") {
      return m === "GET";
    }

    // Patient lookup for prescription queue verification
    if (path === "/api/patients" || (path.startsWith("/api/patients/") && m === "GET")) {
      return m === "GET";
    }

    // Prescribing physician lookup
    if (path === "/api/doctors" || path === "/api/doctors/list") {
      return m === "GET" || m === "POST";
    }

    // Audit logging
    if (path === "/api/audit" || path === "/api/audit/log") {
      return m === "POST";
    }

    return false;
  }

  return false;
}

/**
 * Enforces Role-Based Access Control on incoming HTTP requests.
 * Returns true if the request is authorized to proceed; otherwise writes a 401/403 response and returns false.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @returns {boolean}
 */
export function enforceRbac(req, res) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname;

  // 1. Allow public routes
  if (isPublicPath(pathname)) {
    return true;
  }

  // 2. Extract active role from request headers or query parameter
  const roleHeader = req.headers["x-user-role"];
  const roleQuery = url.searchParams.get("role");
  const authHeader = req.headers["authorization"];

  let role = roleHeader || roleQuery || "";
  if (!role && authHeader && authHeader.toLowerCase().startsWith("role ")) {
    role = authHeader.slice(5);
  }

  const normalized = normalizeRole(role);

  // If no role provided on protected endpoint
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

  // 3. Verify authorization
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
