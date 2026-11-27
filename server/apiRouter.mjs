/**
 * Unified HTTP API Router for Cura-Tech Hospital ERP
 *
 * Handles all core pharmacy/clinical APIs and all 17 ERP module APIs
 * with RBAC enforcement, payload size protection, sanitization,
 * Firestore synchronization, durable disk fallback, and real-time broadcasts.
 */

import { parseInvoiceDocument } from "./intelligentParser.mjs";
import { calculateBillingTotals } from "./billingCalculator.mjs";
import { filterMedicines } from "./inventoryFilter.mjs";
import { validateMedicinePayload, createMedicine, updateMedicine, deleteMedicine, updateMedicineMinStock, isAuthorizedForMinStock } from "./medicineHandler.mjs";
import { listApprovedGrns, updateApprovedGrn, deleteApprovedGrn, isDeveloperRole } from "./approvedGrnHandler.mjs";
import { listDoctors, createDoctor, updateDoctor, deleteDoctor } from "./doctorHandler.mjs";
import { listUsers, createUser, updateUser, deleteUser, sanitizeUserOutput } from "./userHandler.mjs";
import { db, COLLECTIONS, firebaseConfig } from "./firebase.mjs";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { enforceRbac } from "./rbac.mjs";
import {
  loadErpState,
  mutateErpState,
  sanitizeValue,
  sanitizeString,
  makeId,
  syncFirestoreDoc,
  readFirestoreCollection,
} from "./erpStore.mjs";

let currentStaffPlan = 5;
let customStaffPlanLimits = { superadmin: 1, admin: 2, staff: 5 };

export function setSecurityAndCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-user-role");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function sendJson(res, statusCode, data) {
  setSecurityAndCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export function readRawBody(req, maxBytes = 10 * 1024 * 1024, preBuffered = undefined) {
  if (preBuffered !== undefined) {
    return Promise.resolve(preBuffered);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req, maxBytes = 10 * 1024 * 1024, preBuffered = undefined, required = true) {
  const raw = await readRawBody(req, maxBytes, preBuffered);
  if (!raw || !raw.trim()) {
    if (required) {
      throw Object.assign(new Error("Empty request body"), { statusCode: 400 });
    }
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return sanitizeValue(parsed) || {};
  } catch {
    throw Object.assign(new Error("Invalid JSON request payload"), { statusCode: 400 });
  }
}

function notifyUpdate(broadcast, moduleName, action, data) {
  if (typeof broadcast === "function") {
    try {
      broadcast({
        type: "ERP_MODULE_UPDATED",
        payload: {
          module: moduleName,
          action,
          data,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}
  }
}

function branchMatch(item, branchId) {
  if (!branchId || branchId === "all") return true;
  if (!item?.branchId) return branchId === "br_main";
  return item.branchId === branchId;
}

export async function handleApiRequest(req, res, options = {}) {
  const { broadcast, getRealtimeSummary, rawBody } = options;
  setSecurityAndCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Enforce Hospital RBAC across all API endpoints
  if (!enforceRbac(req, res)) {
    return true;
  }

  try {
    // Health check
    if (req.method === "GET" && (pathname === "/api/health" || pathname === "/")) {
      return sendJson(res, 200, {
        status: "ok",
        service: "Cura-Tech Hospital ERP Backend",
        version: "2.0.0",
        firebase: {
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          storageBucket: firebaseConfig.storageBucket,
          status: "connected",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Real-time status
    if (req.method === "GET" && pathname === "/api/realtime/status") {
      return sendJson(res, 200, {
        success: true,
        service: "Cura-Tech Real-Time WebSocket Synchronization Bus",
        ...(typeof getRealtimeSummary === "function" ? getRealtimeSummary() : { total: 0, byRole: {}, activeAlertsCount: 0 }),
        timestamp: new Date().toISOString(),
      });
    }

    // Live Firebase connection status
    if (req.method === "GET" && pathname === "/api/firebase/status") {
      try {
        const metaSnap = await getDoc(doc(db, COLLECTIONS.meta, "app"));
        return sendJson(res, 200, {
          success: true,
          projectId: firebaseConfig.projectId,
          connected: true,
          metaExists: metaSnap.exists(),
          data: metaSnap.exists() ? metaSnap.data() : null,
        });
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          projectId: firebaseConfig.projectId,
          connected: false,
          error: err.message,
        });
      }
    }

    // Parse invoice endpoint (30MB cap for PDFs/images)
    if (req.method === "POST" && pathname === "/api/parse-invoice") {
      const payload = await readJsonBody(req, 30 * 1024 * 1024, rawBody, true);
      const { fileData, fileName, mimeType, existingMedicines = [], existingSuppliers = [], apiKey } = payload;
      if (!fileData) {
        return sendJson(res, 400, { success: false, error: "Missing fileData (base64 string expected)" });
      }
      const cleanBase64 = String(fileData).includes(",") ? String(fileData).split(",")[1] : String(fileData);
      const fileBuffer = Buffer.from(cleanBase64, "base64");
      const result = await parseInvoiceDocument({
        fileBuffer,
        fileName: fileName || "invoice.pdf",
        mimeType: mimeType || "application/pdf",
        existingMedicines,
        existingSuppliers,
        apiKey,
      });
      return sendJson(res, 200, result);
    }

    // Staff plan endpoints
    if (req.method === "GET" && pathname === "/api/staff-plan") {
      return sendJson(res, 200, {
        success: true,
        staffPlan: currentStaffPlan,
        customStaffPlanLimits,
        options: [{ tier: 5, label: "Fully Customizable", limits: customStaffPlanLimits }],
      });
    }

    if (req.method === "POST" && pathname === "/api/staff-plan") {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      if (payload.staffPlan !== undefined) currentStaffPlan = 5;
      if (payload.customLimits && typeof payload.customLimits === "object") {
        customStaffPlanLimits = {
          superadmin: payload.customLimits.superadmin === "unlimited" ? "unlimited" : Math.max(0, Number(payload.customLimits.superadmin) || 0),
          admin: payload.customLimits.admin === "unlimited" ? "unlimited" : Math.max(0, Number(payload.customLimits.admin) || 0),
          staff: payload.customLimits.staff === "unlimited" ? "unlimited" : Math.max(0, Number(payload.customLimits.staff) || 0),
        };
      }
      return sendJson(res, 200, {
        success: true,
        message: "Staff plan updated successfully",
        staffPlan: currentStaffPlan,
        customStaffPlanLimits,
      });
    }

    // Billing calculation endpoint
    if (req.method === "POST" && (pathname === "/api/billing/calculate" || pathname === "/api/invoices/calculate")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const { items = [], discountType = "percent", discountValue = 0 } = payload;
      const result = calculateBillingTotals(items, discountType, discountValue);
      return sendJson(res, 200, { success: true, ...result });
    }

    // Inventory filter endpoints
    if (req.method === "GET" && (pathname === "/api/inventory/narcotic" || (pathname === "/api/inventory" && url.searchParams.get("filter") === "narcotic"))) {
      return sendJson(res, 200, {
        success: true,
        filter: "narcotic",
        label: "Narcotic Drugs",
        description: "Medicines categorized as narcotic or controlled substances",
        medicines: [],
      });
    }

    if (req.method === "POST" && (pathname === "/api/inventory/narcotic" || pathname === "/api/inventory/filter")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const { filter = "narcotic", medicines = [] } = payload;
      const filtered = filterMedicines(medicines, filter);
      return sendJson(res, 200, { success: true, filter, count: filtered.length, medicines: filtered });
    }

    // Inventory medicine validation
    if (req.method === "POST" && (pathname === "/api/inventory/medicine/validate" || pathname === "/api/medicines/validate")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const medicineData = payload.medicine || payload;
      const validation = validateMedicinePayload(medicineData, {
        requirePurchaseDetails: payload.requirePurchaseDetails ?? true,
      });
      if (!validation.isValid) {
        return sendJson(res, 400, { success: false, isValid: false, errors: validation.errors, error: validation.message });
      }
      return sendJson(res, 200, { success: true, isValid: true, cleanData: validation.cleanData });
    }

    // Inventory medicine list
    if (req.method === "GET" && (pathname === "/api/inventory/medicines" || pathname === "/api/medicines")) {
      const docs = await readFirestoreCollection(COLLECTIONS.medicines);
      return sendJson(res, 200, {
        success: true,
        source: docs ? "firestore" : "local",
        count: docs ? docs.length : 0,
        medicines: docs || [],
      });
    }

    // Inventory medicine create
    if (req.method === "POST" && (pathname === "/api/inventory/medicine" || pathname === "/api/medicines")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const { medicine, medicines = [], requirePurchaseDetails = true } = payload;
      const result = createMedicine(medicine || payload, medicines, { requirePurchaseDetails });
      await syncFirestoreDoc(COLLECTIONS.medicines, result.medicine.id, result.medicine);
      return sendJson(res, 201, result);
    }

    // Inventory medicine update
    if (
      (req.method === "PUT" && (pathname.startsWith("/api/inventory/medicine/") || pathname.startsWith("/api/medicines/"))) ||
      (req.method === "POST" && (pathname === "/api/inventory/medicine/update" || pathname === "/api/medicines/update"))
    ) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const pathParts = pathname.split("/");
      const urlId = pathname.includes("/update") ? null : pathParts[pathParts.length - 1];
      const id = payload.id || urlId;
      const role = payload.role || req.headers["x-user-role"] || "";
      const result = updateMedicine(id, payload.patch || payload, payload.medicines || [], role);
      await syncFirestoreDoc(COLLECTIONS.medicines, result.medicine.id, result.medicine);
      return sendJson(res, 200, result);
    }

    // Inventory medicine min-stock
    if (
      (req.method === "PATCH" || req.method === "POST" || req.method === "PUT") &&
      pathname.includes("/min-stock") &&
      (pathname.startsWith("/api/inventory/medicine/") || pathname.startsWith("/api/medicines/"))
    ) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const pathParts = pathname.split("/").filter(Boolean);
      const id = payload.id || pathParts[pathParts.length - 2];
      const role = payload.role || req.headers["x-user-role"] || "";
      const result = updateMedicineMinStock(id, payload.minStock, role, payload.medicines || []);
      await syncFirestoreDoc(COLLECTIONS.medicines, id, { minStock: result.medicine.minStock });
      return sendJson(res, 200, result);
    }

    // Inventory settings
    if (req.method === "GET" && pathname === "/api/inventory/settings") {
      try {
        const metaSnap = await getDoc(doc(db, COLLECTIONS.meta, "app"));
        const flags = metaSnap.exists() ? metaSnap.data()?.featureFlags || {} : {};
        return sendJson(res, 200, { success: true, flags: { minStockFeature: flags.minStockFeature !== false } });
      } catch (err) {
        return sendJson(res, 200, { success: true, flags: { minStockFeature: true }, warning: err.message });
      }
    }

    if (req.method === "POST" && pathname === "/api/inventory/settings") {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const role = payload.role || req.headers["x-user-role"] || "";
      if (!isAuthorizedForMinStock(role)) {
        return sendJson(res, 403, { success: false, error: "Access Denied: Only Developer and Admin roles can modify Minimum Stock settings." });
      }
      const minStockFeature = Boolean(payload.minStockFeature);
      try {
        await setDoc(doc(db, COLLECTIONS.meta, "app"), { featureFlags: { minStockFeature } }, { merge: true });
      } catch {}
      return sendJson(res, 200, { success: true, message: "Inventory control settings updated successfully", minStockFeature });
    }

    // Inventory medicine delete
    if (
      (req.method === "DELETE" && (pathname.startsWith("/api/inventory/medicine/") || pathname.startsWith("/api/medicines/"))) ||
      (req.method === "POST" && (pathname === "/api/inventory/medicine/delete" || pathname === "/api/medicines/delete"))
    ) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, false);
      const pathParts = pathname.split("/");
      const urlId = pathname.includes("/delete") ? null : pathParts[pathParts.length - 1];
      const id = payload.id || urlId;
      const result = deleteMedicine(id, payload.medicines || []);
      try {
        await deleteDoc(doc(db, COLLECTIONS.medicines, id));
      } catch {}
      return sendJson(res, 200, result);
    }

    // System purge
    if (req.method === "POST" && (pathname === "/api/system/purge" || pathname === "/api/data/purge")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, false);
      const role = payload.role || req.headers["x-user-role"] || "";
      if (role && role !== "developer" && role !== "superadmin") {
        return sendJson(res, 403, { success: false, error: "Access Denied: Only Developer or Super Admin can purge system data." });
      }
      const now = new Date().toISOString();
      try {
        await setDoc(doc(db, COLLECTIONS.meta, "app"), {
          auditClearedAt: now,
          invoicesClearedAt: now,
          medicinesClearedAt: now,
          grnsClearedAt: now,
          returnsClearedAt: now,
          counters: { invoice: 1000, grn: 500 },
          updatedAt: now,
        }, { merge: true });
      } catch {}
      return sendJson(res, 200, {
        success: true,
        message: "All old invoices, inventory tablets, audit logs, and report records purged successfully.",
        purgedAt: now,
      });
    }

    // Approved GRN endpoints
    if (req.method === "GET" && pathname === "/api/grn/approved") {
      const role = req.headers["x-user-role"] || url.searchParams.get("role") || "";
      if (!isDeveloperRole(role)) {
        return sendJson(res, 403, { success: false, error: "Access Denied: Only Developer role can view or manage approved GRN entries." });
      }
      return sendJson(res, 200, { success: true, message: "Developer authorized for approved GRN management", role });
    }

    if (req.method === "POST" && (pathname === "/api/grn/approved/list" || pathname === "/api/grn/approved/filter")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const role = payload.role || req.headers["x-user-role"] || "";
      const filtered = listApprovedGrns(payload.grns || [], { search: payload.search || "", startDate: payload.startDate, endDate: payload.endDate }, role);
      return sendJson(res, 200, { success: true, count: filtered.length, grns: filtered });
    }

    if ((req.method === "PUT" && pathname.startsWith("/api/grn/approved/")) || (req.method === "POST" && pathname === "/api/grn/approved/update")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const urlId = pathname.startsWith("/api/grn/approved/") && pathname !== "/api/grn/approved/update" ? pathname.replace("/api/grn/approved/", "") : null;
      const grnId = payload.grnId || urlId;
      const role = payload.role || req.headers["x-user-role"] || "";
      const result = updateApprovedGrn(grnId, payload.patchData || payload, payload.grns || [], payload.medicines || [], role, payload.adjustStock ?? true);
      return sendJson(res, 200, result);
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/grn/approved/")) || (req.method === "POST" && pathname === "/api/grn/approved/delete")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/grn/approved/") && pathname !== "/api/grn/approved/delete" ? pathname.replace("/api/grn/approved/", "") : null;
      const grnId = payload.grnId || urlId;
      const role = payload.role || req.headers["x-user-role"] || url.searchParams.get("role") || "";
      const result = deleteApprovedGrn(grnId, payload.grns || [], payload.medicines || [], role, payload.reverseStock ?? true);
      return sendJson(res, 200, result);
    }

    // Doctor Management
    if (req.method === "GET" && pathname === "/api/doctors") {
      const q = url.searchParams.get("q") || url.searchParams.get("search") || "";
      const docs = (await readFirestoreCollection(COLLECTIONS.doctors)) || [];
      const result = listDoctors(docs, { q });
      return sendJson(res, 200, { success: true, source: "firestore", count: result.length, query: q, doctors: result });
    }

    if (req.method === "POST" && (pathname === "/api/doctors/list" || pathname === "/api/doctors/filter")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, false);
      let docs = payload.doctors || [];
      if (!docs.length) docs = (await readFirestoreCollection(COLLECTIONS.doctors)) || [];
      const result = listDoctors(docs, { q: payload.q || payload.search || "" });
      return sendJson(res, 200, { success: true, count: result.length, doctors: result });
    }

    if (req.method === "POST" && pathname === "/api/doctors") {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const result = createDoctor(payload.doctor || payload, payload.doctors || []);
      await syncFirestoreDoc(COLLECTIONS.doctors, result.doctor.id, result.doctor);
      return sendJson(res, 201, result);
    }

    if ((req.method === "PUT" && pathname.startsWith("/api/doctors/")) || (req.method === "POST" && pathname === "/api/doctors/update")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const urlId = pathname.startsWith("/api/doctors/") && pathname !== "/api/doctors/update" ? pathname.replace("/api/doctors/", "") : null;
      const id = payload.id || urlId;
      const result = updateDoctor(id, payload.patch || payload, payload.doctors || []);
      await syncFirestoreDoc(COLLECTIONS.doctors, result.doctor.id, result.doctor);
      return sendJson(res, 200, result);
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/doctors/")) || (req.method === "POST" && pathname === "/api/doctors/delete")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/doctors/") && pathname !== "/api/doctors/delete" ? pathname.replace("/api/doctors/", "") : null;
      const id = payload.id || urlId;
      const result = deleteDoctor(id, payload.doctors || []);
      try { await deleteDoc(doc(db, COLLECTIONS.doctors, id)); } catch {}
      return sendJson(res, 200, result);
    }

    // Authentication
    if (req.method === "POST" && (pathname === "/api/auth/verify" || pathname === "/api/auth/login")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const cleanUser = sanitizeString(payload.username, 80).toLowerCase();
      const password = String(payload.password || "");
      if (!cleanUser || !password) {
        return sendJson(res, 400, { success: false, error: "Username and password required" });
      }
      const fsUsers = (await readFirestoreCollection(COLLECTIONS.users)) || [];
      const matched = fsUsers.find((u) => String(u.username || "").trim().toLowerCase() === cleanUser);
      if (!matched) {
        return sendJson(res, 401, { success: false, error: "User not found" });
      }
      if (!matched.active) {
        return sendJson(res, 403, { success: false, error: "Account is deactivated. Contact admin." });
      }
      if (matched.password !== password) {
        return sendJson(res, 401, { success: false, error: "Incorrect password" });
      }
      return sendJson(res, 200, {
        success: true,
        message: "Authentication successful",
        user: sanitizeUserOutput(matched),
      });
    }

    // User Management
    if (req.method === "GET" && pathname === "/api/users") {
      const q = url.searchParams.get("q") || url.searchParams.get("search") || "";
      const branchId = url.searchParams.get("branchId") || "";
      const role = url.searchParams.get("role") || "";
      const fsUsers = (await readFirestoreCollection(COLLECTIONS.users)) || [];
      const result = listUsers(fsUsers, { q, branchId, role }).map((u) => sanitizeUserOutput(u));
      return sendJson(res, 200, { success: true, source: "firestore", count: result.length, users: result });
    }

    if (req.method === "POST" && (pathname === "/api/users" || pathname === "/api/users/create")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      let existingUsers = payload.users || [];
      if (!existingUsers.length) existingUsers = (await readFirestoreCollection(COLLECTIONS.users)) || [];
      const result = createUser(payload.user || payload, existingUsers);
      await syncFirestoreDoc(COLLECTIONS.users, result.user.id, result.user);
      return sendJson(res, 201, { ...result, user: sanitizeUserOutput(result.user) });
    }

    if ((req.method === "PUT" && pathname.startsWith("/api/users/")) || (req.method === "POST" && pathname === "/api/users/update")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const urlId = pathname.startsWith("/api/users/") && pathname !== "/api/users/update" ? pathname.replace("/api/users/", "") : null;
      const id = payload.id || urlId;
      let existingUsers = payload.users || [];
      if (!existingUsers.length) existingUsers = (await readFirestoreCollection(COLLECTIONS.users)) || [];
      const result = updateUser(id, payload.patch || payload, existingUsers);
      await syncFirestoreDoc(COLLECTIONS.users, result.user.id, result.user);
      return sendJson(res, 200, { ...result, user: sanitizeUserOutput(result.user) });
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/users/")) || (req.method === "POST" && pathname === "/api/users/delete")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/users/") && pathname !== "/api/users/delete" ? pathname.replace("/api/users/", "") : null;
      const id = payload.id || urlId;
      let existingUsers = payload.users || [];
      if (!existingUsers.length) existingUsers = (await readFirestoreCollection(COLLECTIONS.users)) || [];
      const result = deleteUser(id, existingUsers);
      try { await deleteDoc(doc(db, COLLECTIONS.users, id)); } catch {}
      return sendJson(res, 200, result);
    }

    // Invoices
    if (req.method === "GET" && pathname === "/api/invoices") {
      const branchId = url.searchParams.get("branchId");
      let invoices = (await readFirestoreCollection(COLLECTIONS.invoices)) || [];
      if (branchId) invoices = invoices.filter((inv) => branchMatch(inv, branchId));
      invoices.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      return sendJson(res, 200, { success: true, count: invoices.length, invoices });
    }

    if (req.method === "POST" && (pathname === "/api/invoices" || pathname === "/api/invoices/create")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const invoiceData = payload.invoice || payload;
      const id = invoiceData.id || makeId("inv");
      const cleanInvoice = {
        id,
        number: invoiceData.number || String(Date.now()).slice(-6),
        patientName: invoiceData.patientName || "Walk-in Customer",
        patientPhone: invoiceData.patientPhone || "",
        doctorId: invoiceData.doctorId || "",
        doctorName: invoiceData.doctorName || "",
        branchId: invoiceData.branchId || undefined,
        items: Array.isArray(invoiceData.items) ? invoiceData.items : [],
        subtotal: Number(invoiceData.subtotal) || 0,
        discount: Number(invoiceData.discount) || 0,
        discountType: invoiceData.discountType || "percent",
        discountValue: Number(invoiceData.discountValue) || 0,
        taxAmount: Number(invoiceData.taxAmount) || 0,
        total: Number(invoiceData.total) || 0,
        date: invoiceData.date || new Date().toISOString(),
        createdBy: invoiceData.createdBy || "Staff",
        paymentMethod: invoiceData.paymentMethod || "cash",
        hasNarcotic: Boolean(invoiceData.hasNarcotic),
      };
      await syncFirestoreDoc(COLLECTIONS.invoices, id, cleanInvoice);
      notifyUpdate(broadcast, "pharmacy", "INVOICE_CREATED", cleanInvoice);
      return sendJson(res, 201, { success: true, invoice: cleanInvoice });
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/invoices/")) || (req.method === "POST" && pathname === "/api/invoices/delete")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/invoices/") && pathname !== "/api/invoices/delete" ? pathname.replace("/api/invoices/", "") : null;
      const id = payload.id || urlId;
      if (!id) return sendJson(res, 400, { success: false, error: "Invoice ID required" });
      try { await deleteDoc(doc(db, COLLECTIONS.invoices, id)); } catch {}
      return sendJson(res, 200, { success: true, message: `Invoice ${id} deleted successfully` });
    }

    // Patients
    if (req.method === "GET" && pathname === "/api/patients") {
      const branchId = url.searchParams.get("branchId");
      let patients = (await readFirestoreCollection(COLLECTIONS.patients)) || [];
      if (branchId) patients = patients.filter((p) => branchMatch(p, branchId));
      return sendJson(res, 200, { success: true, count: patients.length, patients });
    }

    if (req.method === "POST" && (pathname === "/api/patients" || pathname === "/api/patients/create")) {
      const payload = await readJsonBody(req, 10 * 1024 * 1024, rawBody, true);
      const p = payload.patient || payload;
      const name = sanitizeString(p.name, 120);
      const phone = sanitizeString(p.phone, 30);
      if (!name || !phone) return sendJson(res, 400, { success: false, error: "Patient name and phone are required" });
      const id = p.id || makeId("pat");
      const cleanPatient = {
        ...p,
        id,
        name,
        phone,
        createdAt: p.createdAt || new Date().toISOString(),
      };
      await syncFirestoreDoc(COLLECTIONS.patients, id, cleanPatient);
      notifyUpdate(broadcast, "patient", "PATIENT_CREATED", cleanPatient);
      return sendJson(res, 201, { success: true, patient: cleanPatient });
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/patients/")) || (req.method === "POST" && pathname === "/api/patients/delete")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/patients/") && pathname !== "/api/patients/delete" ? pathname.replace("/api/patients/", "") : null;
      const id = payload.id || urlId;
      if (!id) return sendJson(res, 400, { success: false, error: "Patient ID required" });
      try { await deleteDoc(doc(db, COLLECTIONS.patients, id)); } catch {}
      return sendJson(res, 200, { success: true, message: `Patient ${id} deleted successfully` });
    }

    // Inpatient Admissions (Firestore + durable erpStore fallback so permission-denied never blocks!)
    if (req.method === "GET" && pathname === "/api/admissions") {
      const branchId = url.searchParams.get("branchId");
      const status = url.searchParams.get("status");
      const fsDocs = await readFirestoreCollection(COLLECTIONS.admissions);
      const state = loadErpState();
      let admissions = fsDocs && fsDocs.length > 0 ? fsDocs : state.admissions || [];
      if (branchId) admissions = admissions.filter((a) => branchMatch(a, branchId));
      if (status) admissions = admissions.filter((a) => a.status === status);
      return sendJson(res, 200, { success: true, count: admissions.length, admissions });
    }

    if (req.method === "POST" && (pathname === "/api/admissions" || pathname === "/api/admissions/create")) {
      const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
      const a = payload.admission || payload;
      const patientName = sanitizeString(a.patientName, 120);
      const ward = sanitizeString(a.ward, 60);
      const bedNumber = sanitizeString(a.bedNumber, 30);
      if (!patientName || !ward || !bedNumber) {
        return sendJson(res, 400, { success: false, error: "Patient name, ward, and bed number are required" });
      }
      const id = a.id || makeId("adm");
      const cleanAdmission = {
        id,
        admissionNumber: a.admissionNumber || `IPD-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: a.patientId || "",
        patientUhid: a.patientUhid || "",
        patientName,
        patientPhone: a.patientPhone || "",
        patientAge: a.patientAge ? Number(a.patientAge) : undefined,
        patientGender: a.patientGender || "Male",
        branchId: a.branchId || "br_main",
        doctorId: a.doctorId || "",
        doctorName: a.doctorName || "",
        department: a.department || "General Medicine",
        ward,
        bedNumber,
        admittedAt: a.admittedAt || new Date().toISOString(),
        admissionReason: a.admissionReason || "Inpatient Care",
        provisionalDiagnosis: a.provisionalDiagnosis || "",
        dailyBedCharge: a.dailyBedCharge ? Number(a.dailyBedCharge) : 1000,
        initialDeposit: a.initialDeposit ? Number(a.initialDeposit) : 0,
        status: a.status || "admitted",
        dischargedAt: a.dischargedAt,
        dischargeCondition: a.dischargeCondition,
        dischargeSummary: a.dischargeSummary,
        createdAt: a.createdAt || new Date().toISOString(),
      };
      mutateErpState((st) => {
        st.admissions = [cleanAdmission, ...(st.admissions || []).filter((x) => x.id !== id)];
      });
      await syncFirestoreDoc(COLLECTIONS.admissions, id, cleanAdmission);
      notifyUpdate(broadcast, "patient", "ADMISSION_CREATED", cleanAdmission);
      return sendJson(res, 201, { success: true, admission: cleanAdmission });
    }

    if ((req.method === "PUT" && pathname.startsWith("/api/admissions/")) || (req.method === "POST" && pathname === "/api/admissions/update")) {
      const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/admissions/") && pathname !== "/api/admissions/update" ? pathname.replace("/api/admissions/", "") : null;
      const id = payload.id || urlId;
      if (!id) return sendJson(res, 400, { success: false, error: "Admission ID required" });
      const patch = { ...(payload.patch || payload) };
      delete patch.id;

      let updated = null;
      mutateErpState((st) => {
        const idx = (st.admissions || []).findIndex((x) => x.id === id || x.admissionNumber === id);
        if (idx !== -1) {
          updated = { ...st.admissions[idx], ...patch };
          st.admissions[idx] = updated;
        } else if (patch.patientName) {
          updated = { id, ...patch };
          st.admissions.unshift(updated);
        }
      });

      if (!updated) {
        try {
          const existing = await getDoc(doc(db, COLLECTIONS.admissions, id));
          if (existing.exists()) {
            updated = { ...existing.data(), ...patch, id };
          }
        } catch {}
      }
      if (!updated) return sendJson(res, 404, { success: false, error: "Admission not found" });

      await syncFirestoreDoc(COLLECTIONS.admissions, updated.id, updated);
      notifyUpdate(broadcast, "patient", "ADMISSION_UPDATED", updated);
      return sendJson(res, 200, { success: true, admission: updated });
    }

    // Suppliers
    if (req.method === "GET" && pathname === "/api/suppliers") {
      const suppliers = (await readFirestoreCollection(COLLECTIONS.suppliers)) || [];
      return sendJson(res, 200, { success: true, count: suppliers.length, suppliers });
    }

    if (req.method === "POST" && (pathname === "/api/suppliers" || pathname === "/api/suppliers/create")) {
      const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
      const s = payload.supplier || payload;
      const name = sanitizeString(s.name, 120);
      if (!name) return sendJson(res, 400, { success: false, error: "Supplier name is required" });
      const id = s.id || makeId("sup");
      const cleanSupplier = {
        id,
        name,
        contact: s.contact || "",
        address: s.address || "",
        email: s.email || "",
        gstNumber: s.gstNumber || "",
        diNumber: s.diNumber || "",
        fixedDiscount: Number(s.fixedDiscount) || 0,
        branchId: s.branchId || undefined,
      };
      await syncFirestoreDoc(COLLECTIONS.suppliers, id, cleanSupplier);
      return sendJson(res, 201, { success: true, supplier: cleanSupplier });
    }

    if ((req.method === "DELETE" && pathname.startsWith("/api/suppliers/")) || (req.method === "POST" && pathname === "/api/suppliers/delete")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, false);
      const urlId = pathname.startsWith("/api/suppliers/") && pathname !== "/api/suppliers/delete" ? pathname.replace("/api/suppliers/", "") : null;
      const id = payload.id || urlId;
      if (!id) return sendJson(res, 400, { success: false, error: "Supplier ID required" });
      try { await deleteDoc(doc(db, COLLECTIONS.suppliers, id)); } catch {}
      return sendJson(res, 200, { success: true, message: `Supplier ${id} deleted successfully` });
    }

    // Branches
    if (req.method === "GET" && pathname === "/api/branches") {
      const branches = (await readFirestoreCollection(COLLECTIONS.branches)) || [];
      return sendJson(res, 200, { success: true, count: branches.length, branches });
    }

    if (req.method === "POST" && (pathname === "/api/branches" || pathname === "/api/branches/create")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const b = payload.branch || payload;
      const name = sanitizeString(b.name, 120);
      const code = sanitizeString(b.code, 30);
      if (!name || !code) return sendJson(res, 400, { success: false, error: "Branch name and code are required" });
      const id = b.id || makeId("br");
      const cleanBranch = {
        id,
        name,
        code,
        storeName: b.storeName || "",
        address: b.address || "",
        phone: b.phone || "",
        active: b.active ?? true,
        createdAt: b.createdAt || new Date().toISOString(),
      };
      await syncFirestoreDoc(COLLECTIONS.branches, id, cleanBranch);
      return sendJson(res, 201, { success: true, branch: cleanBranch });
    }

    // Audit Logs
    if (req.method === "GET" && pathname === "/api/audit") {
      const audit = (await readFirestoreCollection(COLLECTIONS.audit)) || [];
      audit.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      return sendJson(res, 200, { success: true, count: audit.length, audit: audit.slice(0, 500) });
    }

    if (req.method === "POST" && (pathname === "/api/audit" || pathname === "/api/audit/log")) {
      const payload = await readJsonBody(req, 1024 * 1024, rawBody, true);
      const entry = payload.entry || payload;
      const id = entry.id || makeId("a");
      const cleanLog = {
        id,
        user: entry.user || "System",
        action: entry.action || "EVENT",
        details: entry.details || "",
        timestamp: entry.timestamp || new Date().toISOString(),
        branchId: entry.branchId || undefined,
      };
      await syncFirestoreDoc(COLLECTIONS.audit, id, cleanLog);
      return sendJson(res, 201, { success: true, entry: cleanLog });
    }

    // ── LAB ERP APIs ──
    if (pathname.startsWith("/api/lab")) {
      const state = loadErpState();
      const branchId = url.searchParams.get("branchId");
      if (req.method === "GET") {
        return sendJson(res, 200, {
          success: true,
          ...state.lab,
          reagents: (state.lab.reagents || []).filter((r) => branchMatch(r, branchId)),
          purchaseOrders: (state.lab.purchaseOrders || []).filter((p) => branchMatch(p, branchId)),
          externalDispatches: (state.lab.externalDispatches || []).filter((d) => branchMatch(d, branchId)),
        });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 4 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/lab", "").replace(/^\//, "");
        let created = null;

        mutateErpState((st) => {
          if (action === "reagent" || action === "reagents") {
            const item = { id: payload.id || makeId("reg"), branchId: payload.branchId || "br_main", ...payload };
            delete item.action;
            const idx = st.lab.reagents.findIndex((x) => x.id === item.id);
            if (idx >= 0) st.lab.reagents[idx] = { ...st.lab.reagents[idx], ...item };
            else st.lab.reagents.unshift(item);
            created = item;
          } else if (action === "po" || action === "purchase-order") {
            const po = {
              id: payload.id || makeId("lpo"),
              poNumber: payload.poNumber || `LAB-PO-${Date.now().toString().slice(-4)}`,
              branchId: payload.branchId || "br_main",
              date: payload.date || new Date().toISOString().slice(0, 10),
              status: payload.status || "Pending",
              paymentStatus: payload.paymentStatus || "Pending",
              ...payload,
            };
            delete po.action;
            const idx = st.lab.purchaseOrders.findIndex((x) => x.id === po.id);
            if (idx >= 0) st.lab.purchaseOrders[idx] = { ...st.lab.purchaseOrders[idx], ...po };
            else st.lab.purchaseOrders.unshift(po);
            created = po;
          } else if (action === "dispatch" || action === "external-dispatch") {
            const disp = {
              id: payload.id || makeId("ed"),
              branchId: payload.branchId || "br_main",
              dispatchedAt: payload.dispatchedAt || new Date().toISOString().slice(0, 10),
              status: payload.status || "dispatched",
              ...payload,
            };
            delete disp.action;
            st.lab.externalDispatches.unshift(disp);
            if (payload.partnerLab) {
              st.lab.externalLabs = st.lab.externalLabs.map((l) =>
                l.name === payload.partnerLab ? { ...l, pendingDispatches: (l.pendingDispatches || 0) + 1 } : l
              );
            }
            created = disp;
          } else if (action === "test-catalog" || action === "catalog") {
            const test = {
              id: payload.id || makeId("tc"),
              active: payload.active ?? true,
              ...payload,
            };
            delete test.action;
            const idx = st.lab.testCatalog.findIndex((x) => x.id === test.id);
            if (idx >= 0) st.lab.testCatalog[idx] = { ...st.lab.testCatalog[idx], ...test };
            else st.lab.testCatalog.unshift(test);
            created = test;
          } else if (action === "analyzer" || action === "analyzers") {
            const anz = { id: payload.id || makeId("anz"), ...payload };
            delete anz.action;
            const idx = st.lab.analyzers.findIndex((x) => x.id === anz.id);
            if (idx >= 0) st.lab.analyzers[idx] = { ...st.lab.analyzers[idx], ...anz };
            else st.lab.analyzers.unshift(anz);
            created = anz;
          } else if (action === "ingest-auto") {
            st.lab.autoUploads = st.lab.autoUploads.map((au) =>
              !payload.id || au.id === payload.id ? { ...au, status: "verified" } : au
            );
            created = { verified: true };
          }
        });

        await syncFirestoreDoc(COLLECTIONS.lab, "registry", loadErpState().lab);
        notifyUpdate(broadcast, "lab", action || "UPDATED", created);
        return sendJson(res, req.method === "POST" ? 201 : 200, { success: true, item: created, lab: loadErpState().lab });
      }
    }

    // ── CASHIER ERP APIs ──
    if (pathname.startsWith("/api/cashier")) {
      const state = loadErpState();
      const branchId = url.searchParams.get("branchId");
      if (req.method === "GET") {
        return sendJson(res, 200, {
          success: true,
          receipts: (state.cashier.receipts || []).filter((r) => branchMatch(r, branchId)),
          preBookings: (state.cashier.preBookings || []).filter((p) => branchMatch(p, branchId)),
          emergencyLogs: (state.cashier.emergencyLogs || []).filter((e) => branchMatch(e, branchId)),
        });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/cashier", "").replace(/^\//, "");
        let created = null;

        mutateErpState((st) => {
          if (action === "prebooking" || action === "prebookings") {
            const pb = {
              id: payload.id || makeId("pb"),
              bookingNo: payload.bookingNo || `PB-2026-${Math.floor(100 + Math.random() * 900)}`,
              branchId: payload.branchId || "br_main",
              status: payload.status || "Confirmed",
              ...payload,
            };
            delete pb.action;
            st.cashier.preBookings.unshift(pb);
            created = pb;
          } else if (action === "emergency") {
            const emg = {
              id: payload.id || makeId("emg"),
              caseNumber: payload.caseNumber || `ER-2026-${Math.floor(100 + Math.random() * 900)}`,
              branchId: payload.branchId || "br_main",
              timestamp: new Date().toISOString(),
              ...payload,
            };
            delete emg.action;
            st.cashier.emergencyLogs.unshift(emg);
            created = emg;
          } else if (action === "clear-payment") {
            const idx = st.cashier.receipts.findIndex((r) => r.id === payload.id);
            if (idx >= 0) {
              st.cashier.receipts[idx] = { ...st.cashier.receipts[idx], status: "cleared", clearedAt: new Date().toISOString() };
              created = st.cashier.receipts[idx];
            }
          } else {
            const rcpt = {
              id: payload.id || makeId("rcpt"),
              receiptNumber: payload.receiptNumber || `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
              branchId: payload.branchId || "br_main",
              date: payload.date || new Date().toISOString(),
              status: payload.status || "cleared",
              ...payload,
            };
            delete rcpt.action;
            st.cashier.receipts.unshift(rcpt);
            created = rcpt;
          }
        });

        await syncFirestoreDoc(COLLECTIONS.cashier, "ledger", loadErpState().cashier);
        notifyUpdate(broadcast, "cashier", action || "RECEIPT", created);
        return sendJson(res, req.method === "POST" ? 201 : 200, { success: true, item: created, cashier: loadErpState().cashier });
      }
    }

    // ── CASH CLOSE & ACCOUNTS APIs ──
    if (pathname.startsWith("/api/cash-close") || pathname.startsWith("/api/accounts")) {
      const state = loadErpState();
      const branchId = url.searchParams.get("branchId");
      if (req.method === "GET") {
        return sendJson(res, 200, {
          success: true,
          accounts: (state.accounts.accounts || []).filter((a) => branchMatch(a, branchId)),
          cashCloseLogs: (state.accounts.cashCloseLogs || []).filter((c) => branchMatch(c, branchId)),
          expenses: (state.accounts.expenses || []).filter((e) => branchMatch(e, branchId)),
          receivables: (state.accounts.receivables || []).filter((r) => branchMatch(r, branchId)),
          doctorIncomes: state.accounts.doctorIncomes || [],
        });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || (pathname.startsWith("/api/cash-close") ? "cash-close" : pathname.replace("/api/accounts", "").replace(/^\//, ""));
        let created = null;

        mutateErpState((st) => {
          if (action === "cash-close" || action === "cash_close") {
            const rec = {
              id: payload.id || makeId("cc"),
              branchId: payload.branchId || "br_main",
              date: payload.date || new Date().toISOString().slice(0, 10),
              createdAt: payload.createdAt || new Date().toISOString(),
              ...payload,
            };
            delete rec.action;
            st.accounts.cashCloseLogs.unshift(rec);
            created = rec;
          } else if (action === "expense" || action === "expenses") {
            const exp = {
              id: payload.id || makeId("exp"),
              voucherNumber: payload.voucherNumber || `VCH-2026-${Math.floor(100 + Math.random() * 900)}`,
              branchId: payload.branchId || "br_main",
              date: payload.date || new Date().toISOString().slice(0, 10),
              createdAt: payload.createdAt || new Date().toISOString(),
              ...payload,
            };
            delete exp.action;
            const idx = st.accounts.expenses.findIndex((x) => x.id === exp.id);
            if (idx >= 0) st.accounts.expenses[idx] = { ...st.accounts.expenses[idx], ...exp };
            else st.accounts.expenses.unshift(exp);
            created = exp;
          } else if (action === "receivable" || action === "receivables") {
            const rec = {
              id: payload.id || makeId("rec"),
              branchId: payload.branchId || "br_main",
              claimDate: payload.claimDate || new Date().toISOString().slice(0, 10),
              createdAt: payload.createdAt || new Date().toISOString(),
              ...payload,
            };
            delete rec.action;
            const idx = st.accounts.receivables.findIndex((x) => x.id === rec.id);
            if (idx >= 0) st.accounts.receivables[idx] = { ...st.accounts.receivables[idx], ...rec };
            else st.accounts.receivables.unshift(rec);
            created = rec;
          } else if (action === "account" || action === "accounts") {
            const acc = {
              id: payload.id || makeId("acc"),
              branchId: payload.branchId || "br_main",
              ...payload,
            };
            delete acc.action;
            st.accounts.accounts.unshift(acc);
            created = acc;
          } else if (action === "doctor-income" || action === "doctor_income") {
            const di = {
              id: payload.id || makeId("di"),
              paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
              ...payload,
            };
            delete di.action;
            const idx = st.accounts.doctorIncomes.findIndex((x) => x.id === di.id);
            if (idx >= 0) st.accounts.doctorIncomes[idx] = { ...st.accounts.doctorIncomes[idx], ...di };
            else st.accounts.doctorIncomes.unshift(di);
            created = di;
          }
        });

        await syncFirestoreDoc(COLLECTIONS.accounts, "ledger", loadErpState().accounts);
        notifyUpdate(broadcast, "accounts", action || "UPDATED", created);
        return sendJson(res, 201, { success: true, record: created, ...loadErpState().accounts });
      }
    }

    // ── REPORTS AGGREGATION API ──
    if (pathname.startsWith("/api/reports") && req.method === "GET") {
      const state = loadErpState();
      return sendJson(res, 200, {
        success: true,
        cashCloseLogs: state.accounts.cashCloseLogs,
        preBookings: state.cashier.preBookings,
        receipts: state.cashier.receipts,
        externalDispatches: state.lab.externalDispatches,
        doctorIncomes: state.accounts.doctorIncomes,
        expenses: state.accounts.expenses,
      });
    }

    // ── CERTIFICATES API ──
    if (pathname.startsWith("/api/certificates")) {
      const state = loadErpState();
      const branchId = url.searchParams.get("branchId");
      if (req.method === "GET") {
        const list = (state.certificates || []).filter((c) => branchMatch(c, branchId));
        return sendJson(res, 200, { success: true, count: list.length, certificates: list });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const cert = {
          id: payload.id || makeId("cert"),
          branchId: payload.branchId || "br_main",
          status: payload.status || "issued",
          createdAt: payload.createdAt || new Date().toISOString(),
          ...payload,
        };
        mutateErpState((st) => {
          const idx = st.certificates.findIndex((c) => c.id === cert.id);
          if (idx >= 0) st.certificates[idx] = { ...st.certificates[idx], ...cert };
          else st.certificates.unshift(cert);
        });
        await syncFirestoreDoc(COLLECTIONS.certificates, cert.id, cert);
        notifyUpdate(broadcast, "certificate", "CERTIFICATE_SAVED", cert);
        return sendJson(res, req.method === "POST" ? 201 : 200, { success: true, certificate: cert, certificates: loadErpState().certificates });
      }
    }

    // ── EQUIPMENTS API ──
    if (pathname.startsWith("/api/equipments")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.equipments });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 4 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/equipments", "").replace(/^\//, "");
        let item = null;
        mutateErpState((st) => {
          if (action === "worksheet" || action === "worksheets") {
            item = { id: payload.id || makeId("ws"), date: payload.date || new Date().toISOString().slice(0, 10), ...payload };
            delete item.action;
            st.equipments.worksheets.unshift(item);
          } else if (action === "gate-pass" || action === "gatePasses") {
            item = { id: payload.id || makeId("gp"), passNumber: payload.passNumber || `GP-2026-${Math.floor(100 + Math.random() * 900)}`, createdAt: new Date().toISOString(), ...payload };
            delete item.action;
            const idx = st.equipments.gatePasses.findIndex((g) => g.id === item.id);
            if (idx >= 0) st.equipments.gatePasses[idx] = { ...st.equipments.gatePasses[idx], ...item };
            else st.equipments.gatePasses.unshift(item);
          } else if (action === "document" || action === "documents") {
            item = { id: payload.id || makeId("doc"), uploadDate: payload.uploadDate || new Date().toISOString().slice(0, 10), ...payload };
            delete item.action;
            st.equipments.documents.unshift(item);
          } else if (action === "service" || action === "serviceLogs") {
            item = { id: payload.id || makeId("srv"), serviceDate: payload.serviceDate || new Date().toISOString().slice(0, 10), ...payload };
            delete item.action;
            st.equipments.serviceLogs.unshift(item);
          } else {
            item = { id: payload.id || makeId("eq"), branchId: payload.branchId || "br_main", createdAt: new Date().toISOString(), ...payload };
            delete item.action;
            const idx = st.equipments.equipments.findIndex((e) => e.id === item.id);
            if (idx >= 0) st.equipments.equipments[idx] = { ...st.equipments.equipments[idx], ...item };
            else st.equipments.equipments.unshift(item);
          }
        });
        await syncFirestoreDoc(COLLECTIONS.equipments, "assets", loadErpState().equipments);
        notifyUpdate(broadcast, "equipments", action || "UPDATED", item);
        return sendJson(res, 200, { success: true, item, ...loadErpState().equipments });
      }
    }

    // ── ADMIN ERP API ──
    if (pathname.startsWith("/api/admin")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.admin });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 4 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/admin", "").replace(/^\//, "");
        let item = null;
        mutateErpState((st) => {
          if (action === "employee" || action === "employees") {
            item = {
              id: payload.id || `EMP-${Date.now().toString().slice(-4)}`,
              code: payload.code || `CURA-EMP-${(st.admin.employees.length + 1).toString().padStart(3, "0")}`,
              dateOfJoin: payload.dateOfJoin || new Date().toISOString().slice(0, 10),
              status: payload.status || "Active",
              ...payload,
            };
            delete item.action;
            const idx = st.admin.employees.findIndex((e) => e.id === item.id);
            if (idx >= 0) st.admin.employees[idx] = { ...st.admin.employees[idx], ...item };
            else st.admin.employees.unshift(item);
          } else if (action === "schedule" || action === "schedules") {
            item = { id: payload.id || makeId("SCH"), ...payload };
            delete item.action;
            const idx = st.admin.schedules.findIndex((s) => s.id === item.id);
            if (idx >= 0) st.admin.schedules[idx] = { ...st.admin.schedules[idx], ...item };
            else st.admin.schedules.unshift(item);
          } else if (action === "attendance") {
            item = { id: payload.id || makeId("att"), date: payload.date || new Date().toISOString().slice(0, 10), ...payload };
            delete item.action;
            const idx = st.admin.attendance.findIndex((a) => a.id === item.id);
            if (idx >= 0) st.admin.attendance[idx] = { ...st.admin.attendance[idx], ...item };
            else st.admin.attendance.unshift(item);
          } else if (action === "payroll") {
            item = { id: payload.id || makeId("pay"), disbursedAt: new Date().toISOString(), ...payload };
            delete item.action;
            st.admin.payrollRuns.unshift(item);
          } else if (action === "allotment") {
            item = { id: payload.id || makeId("alt"), updatedAt: new Date().toISOString(), ...payload };
            delete item.action;
            st.admin.allotments.unshift(item);
          } else if (action === "id-card-forward") {
            item = { id: payload.id || makeId("idf"), forwardedAt: new Date().toISOString(), ...payload };
            delete item.action;
            st.admin.idCardForwards.unshift(item);
          } else if (action === "phn-merge") {
            item = { id: makeId("phn"), mergedAt: new Date().toISOString(), ...payload };
            delete item.action;
            st.admin.phnMerges.unshift(item);
          } else if (action === "role-menu-mapping") {
            st.admin.roleMenuMap = { ...(st.admin.roleMenuMap || {}), ...(payload.mapping || {}) };
            item = st.admin.roleMenuMap;
          }
        });
        await syncFirestoreDoc(COLLECTIONS.admin, "workspace", loadErpState().admin);
        notifyUpdate(broadcast, "admin", action || "UPDATED", item);
        return sendJson(res, 200, { success: true, item, ...loadErpState().admin });
      }
    }

    // ── PHYSIOTHERAPY API ──
    if (pathname.startsWith("/api/physiotherapy")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.physiotherapy });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/physiotherapy", "").replace(/^\//, "");
        let created = null;
        mutateErpState((st) => {
          if (action === "item" || action === "items") {
            created = { id: payload.id || `PHY-${(st.physiotherapy.items.length + 1).toString().padStart(3, "0")}`, ...payload };
            delete created.action;
            const idx = st.physiotherapy.items.findIndex((i) => i.id === created.id);
            if (idx >= 0) st.physiotherapy.items[idx] = { ...st.physiotherapy.items[idx], ...created };
            else st.physiotherapy.items.push(created);
          } else if (action === "vendor" || action === "vendors") {
            created = { id: payload.id || makeId("vphy"), ...payload };
            delete created.action;
            st.physiotherapy.vendors.unshift(created);
          } else if (action === "po" || action === "purchase-order") {
            created = { id: payload.id || makeId("ppo"), poNumber: payload.poNumber || `PO-PHY-${Date.now().toString().slice(-4)}`, date: new Date().toISOString().slice(0, 10), status: payload.status || "Pending", ...payload };
            delete created.action;
            st.physiotherapy.purchaseOrders.unshift(created);
          } else if (action === "return" || action === "sale-return") {
            created = { id: payload.id || makeId("pret"), date: new Date().toISOString().slice(0, 10), ...payload };
            delete created.action;
            st.physiotherapy.returns.unshift(created);
            if (payload.itemId && payload.qty) {
              st.physiotherapy.items = st.physiotherapy.items.map((i) =>
                i.id === payload.itemId ? { ...i, stock: i.stock + Number(payload.qty) } : i
              );
            }
          } else if (action === "stock-update") {
            const idx = st.physiotherapy.items.findIndex((i) => i.id === payload.itemId);
            if (idx >= 0) {
              st.physiotherapy.items[idx].stock = Math.max(0, Number(payload.stock ?? st.physiotherapy.items[idx].stock + Number(payload.delta || 0)));
              created = st.physiotherapy.items[idx];
            }
          } else {
            created = { id: payload.id || makeId("PS"), date: payload.date || new Date().toISOString().slice(0, 10), ...payload };
            delete created.action;
            st.physiotherapy.sales.unshift(created);
            if (Array.isArray(created.items)) {
              for (const line of created.items) {
                st.physiotherapy.items = st.physiotherapy.items.map((i) =>
                  i.id === line.itemId ? { ...i, stock: Math.max(0, i.stock - Number(line.qty || 0)) } : i
                );
              }
            }
          }
        });
        await syncFirestoreDoc(COLLECTIONS.physiotherapy, "suberp", loadErpState().physiotherapy);
        notifyUpdate(broadcast, "physiotherapy", action || "UPDATED", created);
        return sendJson(res, 201, { success: true, item: created, ...loadErpState().physiotherapy });
      }
    }

    // ── CENTRAL STORE API ──
    if (pathname.startsWith("/api/store")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.store });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/store", "").replace(/^\//, "");
        let created = null;
        mutateErpState((st) => {
          if (action === "item" || action === "items") {
            created = { id: payload.id || `SI-${(st.store.items.length + 1).toString().padStart(3, "0")}`, ...payload };
            delete created.action;
            const idx = st.store.items.findIndex((i) => i.id === created.id);
            if (idx >= 0) st.store.items[idx] = { ...st.store.items[idx], ...created };
            else st.store.items.push(created);
          } else if (action === "vendor" || action === "vendors") {
            created = { id: payload.id || makeId("sv"), ...payload };
            delete created.action;
            st.store.vendors.unshift(created);
          } else if (action === "po" || action === "purchase-order") {
            created = { id: payload.id || makeId("spo"), poNumber: payload.poNumber || `PO-ST-${Date.now().toString().slice(-4)}`, date: new Date().toISOString().slice(0, 10), payStatus: payload.payStatus || "Pending", ...payload };
            delete created.action;
            const idx = st.store.purchaseOrders.findIndex((p) => p.id === created.id);
            if (idx >= 0) st.store.purchaseOrders[idx] = { ...st.store.purchaseOrders[idx], ...created };
            else st.store.purchaseOrders.unshift(created);
          } else if (action === "document" || action === "documents") {
            created = { id: payload.id || makeId("sdoc"), date: payload.date || new Date().toISOString().slice(0, 10), ...payload };
            delete created.action;
            st.store.documents.unshift(created);
          } else if (action === "return" || action === "sales-return") {
            created = { id: payload.id || makeId("sret"), date: new Date().toISOString().slice(0, 10), ...payload };
            delete created.action;
            st.store.returns.unshift(created);
            if (payload.itemId && payload.qty) {
              st.store.items = st.store.items.map((i) =>
                i.id === payload.itemId ? { ...i, stock: i.stock + Number(payload.qty) } : i
              );
            }
          } else if (action === "stock-update") {
            const idx = st.store.items.findIndex((i) => i.id === payload.itemId);
            if (idx >= 0) {
              st.store.items[idx].stock = Math.max(0, Number(payload.stock ?? st.store.items[idx].stock + Number(payload.delta || 0)));
              created = st.store.items[idx];
            }
          } else {
            created = { id: payload.id || makeId("IND"), indentNo: payload.indentNo || `IND-2026-${(st.store.indents.length + 1).toString().padStart(4, "0")}`, date: new Date().toISOString().slice(0, 10), status: "Fulfilled", ...payload };
            delete created.action;
            st.store.indents.unshift(created);
            if (Array.isArray(payload.deductions)) {
              for (const d of payload.deductions) {
                st.store.items = st.store.items.map((i) =>
                  i.id === d.itemId ? { ...i, stock: Math.max(0, i.stock - Number(d.qty || 0)) } : i
                );
              }
            }
          }
        });
        await syncFirestoreDoc(COLLECTIONS.store, "suberp", loadErpState().store);
        notifyUpdate(broadcast, "store", action || "UPDATED", created);
        return sendJson(res, 201, { success: true, indent: created, item: created, ...loadErpState().store });
      }
    }

    // ── AMBULANCE FLEET API ──
    if (pathname.startsWith("/api/ambulance")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.ambulance });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/ambulance", "").replace(/^\//, "");
        let item = null;
        mutateErpState((st) => {
          if (action === "vehicle" || action === "vehicles") {
            item = { id: payload.id || makeId("VEH"), ...payload };
            delete item.action;
            const idx = st.ambulance.vehicles.findIndex((v) => v.id === item.id);
            if (idx >= 0) st.ambulance.vehicles[idx] = { ...st.ambulance.vehicles[idx], ...item };
            else st.ambulance.vehicles.push(item);
          } else if (action === "complete-trip") {
            const idx = st.ambulance.trips.findIndex((t) => t.id === payload.tripId);
            if (idx >= 0) {
              const t = st.ambulance.trips[idx];
              st.ambulance.trips[idx] = { ...t, status: "completed", paymentStatus: "paid", endTime: payload.endTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
              st.ambulance.vehicles = st.ambulance.vehicles.map((v) =>
                v.id === t.vehicleId ? { ...v, status: "available", currentOdometer: v.currentOdometer + Number(t.distanceKm || 0) } : v
              );
              item = st.ambulance.trips[idx];
            }
          } else {
            item = { id: payload.id || makeId("TRIP"), tripNumber: payload.tripNumber || `AMB-TRIP-2026-${(st.ambulance.trips.length + 82).toString().padStart(3, "0")}`, createdAt: new Date().toISOString(), ...payload };
            delete item.action;
            st.ambulance.trips.unshift(item);
            if (item.vehicleId) {
              st.ambulance.vehicles = st.ambulance.vehicles.map((v) => (v.id === item.vehicleId ? { ...v, status: "on_trip" } : v));
            }
          }
        });
        await syncFirestoreDoc(COLLECTIONS.ambulance, "fleet", loadErpState().ambulance);
        notifyUpdate(broadcast, "ambulance", action || "UPDATED", item);
        return sendJson(res, 201, { success: true, trip: item, ...loadErpState().ambulance });
      }
    }

    // ── SKIN & DERMATOLOGY API ──
    if (pathname.startsWith("/api/skin")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, procedures: state.skin.records, regimens: state.skin.products, ...state.skin });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || pathname.replace("/api/skin", "").replace(/^\//, "");
        let item = null;
        mutateErpState((st) => {
          if (action === "dispense") {
            const idx = st.skin.products.findIndex((p) => p.id === payload.productId);
            if (idx >= 0) {
              st.skin.products[idx].stock = Math.max(0, st.skin.products[idx].stock - 1);
              item = st.skin.products[idx];
            }
          } else if (action === "product") {
            item = { id: payload.id || makeId("PROD"), ...payload };
            delete item.action;
            st.skin.products.unshift(item);
          } else {
            item = { id: payload.id || `SKIN-REC-${(st.skin.records.length + 1).toString().padStart(2, "0")}`, date: payload.date || new Date().toISOString().slice(0, 10), ...payload };
            delete item.action;
            st.skin.records.unshift(item);
          }
        });
        await syncFirestoreDoc(COLLECTIONS.skin, "clinic", loadErpState().skin);
        notifyUpdate(broadcast, "skin", action || "UPDATED", item);
        return sendJson(res, 201, { success: true, session: item, ...loadErpState().skin });
      }
    }

    // ── FACILITY MAINTENANCE API ──
    if (pathname.startsWith("/api/maintenance") || pathname.startsWith("/api/facility")) {
      const state = loadErpState();
      if (req.method === "GET") {
        return sendJson(res, 200, { success: true, ...state.maintenance });
      }
      if (req.method === "POST" || req.method === "PUT") {
        const payload = await readJsonBody(req, 2 * 1024 * 1024, rawBody, true);
        const action = payload.action || "";
        let item = null;
        mutateErpState((st) => {
          if (action === "amc") {
            item = { id: payload.id || makeId("AMC"), ...payload };
            delete item.action;
            st.maintenance.amcContracts.unshift(item);
          } else {
            item = {
              id: payload.id || makeId("WO"),
              ticketNumber: payload.ticketNumber || `WO-2026-${(st.maintenance.workOrders.length + 55).toString().padStart(3, "0")}`,
              reportedDate: payload.reportedDate || new Date().toISOString().slice(0, 10),
              ...payload,
            };
            delete item.action;
            const idx = st.maintenance.workOrders.findIndex((w) => w.id === item.id);
            if (idx >= 0) st.maintenance.workOrders[idx] = { ...st.maintenance.workOrders[idx], ...item };
            else st.maintenance.workOrders.unshift(item);
          }
        });
        await syncFirestoreDoc(COLLECTIONS.maintenance, "facility", loadErpState().maintenance);
        notifyUpdate(broadcast, "maintenance", action || "UPDATED", item);
        return sendJson(res, 201, { success: true, workOrder: item, ...loadErpState().maintenance });
      }
    }

    sendJson(res, 404, { success: false, error: `Route not found: ${req.method} ${pathname}` });
    return true;
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    console.error(`[API Error] ${req.method} ${pathname}:`, err?.message || err);
    sendJson(res, statusCode, {
      success: false,
      error: statusCode >= 500 ? "Internal server error" : err.message || "Request failed",
    });
    return true;
  }
}
