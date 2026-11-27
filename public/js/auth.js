/**
 * Authentication, Session Auto-Logout on Exit/Idle & Granular RBAC
 */
import * as db from "./db.js";
import { firebaseConfig, USERNAME_EMAIL_DOMAIN, isFirebaseConfigured } from "./firebase-config.js";
import { DEFAULT_ROLE_PERMISSIONS } from "./seed-data.js";

const SESSION_KEY = "guruhospital_active_session_v1";

export const PERMISSION_LABELS = [
  { key: "patient", label: "Patient Reception & IP/OP" },
  { key: "doctor", label: "Doctor Clinical Workbench" },
  { key: "lab", label: "Laboratory & Diagnostics" },
  { key: "pharmacy", label: "Pharmacy Sales & Stock" },
  { key: "cashier", label: "Cashier Billing & POS" },
  { key: "certificate", label: "Medical Certificates" },
  { key: "physiotherapy", label: "Physiotherapy Module" },
  { key: "store", label: "General Store Inventory" },
  { key: "ambulance", label: "Ambulance Dispatch" },
  { key: "skin", label: "Skin & Aesthetics" },
  { key: "equipments", label: "Biomedical Equipments" },
  { key: "maintenance", label: "Master Catalog Maintenance" },
  { key: "accounts", label: "Accounts & Cash Close" },
  { key: "reports", label: "Enterprise Reports Hub" },
  { key: "approve_grn", label: "Approve Pharmacy/Store GRN" },
  { key: "manage_inventory_settings", label: "Manage Inventory Settings" },
  { key: "view_financial_reports", label: "View Full Financial Reports" },
  { key: "void_bills", label: "Void / Delete Bills" },
  { key: "manage_users", label: "User & Role Management" },
  { key: "admin", label: "System Admin Settings" }
];

let currentUser = null;
let idleTimerId = null;
let lastActivityAt = Date.now();
let logoutCallback = null;
let isPrintingFlag = false;
let watchersBound = false;
let watcherConfig = { idleMinutes: 15, strictLogoutOnHide: false, onTick: null };

export function setPrintingState(active) {
  isPrintingFlag = Boolean(active);
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getCurrentUser() {
  return currentUser;
}

export function isAdmin() {
  return currentUser?.role === "admin";
}

export function hasPermission(permKey) {
  if (!currentUser) return false;
  if (!permKey || permKey === "app_home" || permKey === "nalam") return true;
  if (currentUser.role === "admin") return true;
  return Boolean(currentUser.permissions && currentUser.permissions[permKey]);
}

export function requirePermission(permKey, actionLabel = "perform this action") {
  if (hasPermission(permKey)) return true;
  throw new Error(`Access Denied: Your role does not have permission to ${actionLabel}. Please contact an Admin.`);
}

export async function logAudit(action, moduleName, details) {
  try {
    await db.add("audit_logs", {
      timestamp: new Date().toISOString(),
      user: currentUser?.username || "anonymous",
      role: currentUser?.role || "none",
      module: moduleName,
      action,
      details
    });
  } catch (err) {
    console.warn("Audit log skipped:", err);
  }
}

export async function signIn(identifier, password) {
  const cleanId = (identifier || "").trim().toLowerCase();
  if (!cleanId || !password) throw new Error("Please enter both username and password.");

  if (!isFirebaseConfigured()) {
    const users = await db.list("users");
    const found = users.find(
      (u) => u.username.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)
    );
    if (!found) throw new Error("Invalid username or password.");
    if (found.active === false) throw new Error("This account has been deactivated by an Administrator.");

    const inputHash = await sha256Hex(password);
    if (found.passwordHash !== inputHash) throw new Error("Invalid username or password.");

    currentUser = { ...found };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ uid: found.id, loginAt: Date.now() }));
    await logAudit("LOGIN", "Auth", `User ${found.username} signed in (Local Sandbox)`);
    return currentUser;
  }

  // Firebase Auth mode
  const ctx = db.getFirebaseContext();
  let email = cleanId.includes("@") ? cleanId : `${cleanId}@${USERNAME_EMAIL_DOMAIN}`;

  if (!cleanId.includes("@")) {
    const lookup = await db.getById("usernames", cleanId);
    if (lookup && lookup.email) email = lookup.email;
  }

  const cred = await ctx.authMod.signInWithEmailAndPassword(ctx.auth, email, password);
  let profile = await db.getById("users", cred.user.uid);

  // First-time bootstrap fallback if initial Admin logs in directly after creating user in Firebase Console
  if (!profile) {
    const inferredUsername = email.split("@")[0].toLowerCase();
    const inferredRole = inferredUsername === "kumaran" ? "admin" : "staff";
    profile = {
      id: cred.user.uid,
      username: inferredUsername,
      email,
      fullName: inferredUsername.toUpperCase(),
      role: inferredRole,
      department: inferredRole === "admin" ? "Administration" : "General",
      active: true,
      permissions: { ...(DEFAULT_ROLE_PERMISSIONS[inferredRole] || DEFAULT_ROLE_PERMISSIONS.staff) },
      createdAt: new Date().toISOString()
    };
    await db.set("users", cred.user.uid, profile);
    await db.set("usernames", inferredUsername, { email, uid: cred.user.uid, active: true });
  }

  if (profile.active === false) {
    await ctx.authMod.signOut(ctx.auth);
    throw new Error("This account is deactivated. Contact Guru Hospital Admin.");
  }

  currentUser = profile;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ uid: profile.id, loginAt: Date.now() }));
  await logAudit("LOGIN", "Auth", `User ${profile.username} signed in (Firebase Live)`);
  return currentUser;
}

export async function restoreSession() {
  if (!isFirebaseConfigured()) {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const { uid } = JSON.parse(raw);
      const user = await db.getById("users", uid);
      if (user && user.active !== false) {
        currentUser = user;
        return currentUser;
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
    return null;
  }

  const ctx = db.getFirebaseContext();
  return new Promise((resolve) => {
    const unsub = ctx.authMod.onAuthStateChanged(ctx.auth, async (fbUser) => {
      unsub();
      if (!fbUser) {
        sessionStorage.removeItem(SESSION_KEY);
        return resolve(null);
      }
      const profile = await db.getById("users", fbUser.uid);
      if (profile && profile.active !== false) {
        currentUser = profile;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ uid: profile.id, loginAt: Date.now() }));
        resolve(currentUser);
      } else {
        await ctx.authMod.signOut(ctx.auth);
        sessionStorage.removeItem(SESSION_KEY);
        resolve(null);
      }
    });
  });
}

export async function signOut(reason = "Manual Log Off") {
  if (currentUser) {
    await logAudit("LOGOUT", "Auth", `${currentUser.username}: ${reason}`);
  }
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  stopAutoLogoutWatchers();

  if (isFirebaseConfigured()) {
    const ctx = db.getFirebaseContext();
    if (ctx?.auth) await ctx.authMod.signOut(ctx.auth).catch(() => {});
  }
  if (typeof logoutCallback === "function") {
    logoutCallback(reason);
  }
}

function recordActivity() {
  lastActivityAt = Date.now();
}

export function startAutoLogoutWatchers({ idleMinutes = 15, strictLogoutOnHide = false, onTick, onLogout }) {
  stopAutoLogoutWatchers();
  logoutCallback = onLogout;
  watcherConfig = { idleMinutes, strictLogoutOnHide, onTick };
  lastActivityAt = Date.now();

  if (!watchersBound) {
    watchersBound = true;
    ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    window.addEventListener("beforeprint", () => setPrintingState(true));
    window.addEventListener("afterprint", () => setTimeout(() => setPrintingState(false), 600));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && currentUser && watcherConfig.strictLogoutOnHide && !isPrintingFlag) {
        signOut("Auto-logged out when leaving/minimizing app");
      }
    });

    // Clear session token if user closes tab/browser (while keeping refresh working only when same tab reloads if needed)
    window.addEventListener("pagehide", (evt) => {
      if (!evt.persisted && watcherConfig.strictLogoutOnHide && currentUser && !isPrintingFlag) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
  }

  const limitMs = Math.max(1, Number(idleMinutes) || 15) * 60 * 1000;
  idleTimerId = setInterval(() => {
    if (!currentUser) return;
    const elapsed = Date.now() - lastActivityAt;
    const remainingSec = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
    if (typeof watcherConfig.onTick === "function") watcherConfig.onTick(remainingSec);
    if (elapsed >= limitMs && !isPrintingFlag) {
      signOut(`Session auto-locked after ${idleMinutes} minutes of inactivity`);
    }
  }, 1000);
}

export function stopAutoLogoutWatchers() {
  if (idleTimerId) {
    clearInterval(idleTimerId);
    idleTimerId = null;
  }
}

export async function createUserAccount({ username, email, fullName, password, role, department, permissions }) {
  requirePermission("manage_users", "create user accounts");
  const cleanUser = (username || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!cleanUser || cleanUser.length < 3) throw new Error("Username must be at least 3 valid characters (letters/numbers).");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

  const userEmail = (email || `${cleanUser}@${USERNAME_EMAIL_DOMAIN}`).trim().toLowerCase();
  const basePerms = permissions || { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.staff) };

  if (!isFirebaseConfigured()) {
    const existing = await db.list("users");
    if (existing.some((u) => u.username.toLowerCase() === cleanUser)) {
      throw new Error(`Username "${cleanUser}" already exists.`);
    }
    const uid = `uid_${cleanUser}_${Date.now()}`;
    const newUser = await db.set("users", uid, {
      username: cleanUser,
      email: userEmail,
      fullName: fullName.trim() || cleanUser.toUpperCase(),
      role: role === "admin" ? "admin" : "staff",
      department: department || "General",
      active: true,
      passwordHash: await sha256Hex(password),
      permissions: basePerms,
      createdAt: new Date().toISOString()
    });
    await logAudit("CREATE_USER", "Admin", `Created user ${cleanUser} (${role})`);
    return newUser;
  }

  // Firebase mode: secondary app instance keeps current Admin signed in
  const ctx = db.getFirebaseContext();
  const secondaryApp = ctx.appMod.getApps().find((a) => a.name === "AdminUserCreator")
    || ctx.appMod.initializeApp(firebaseConfig, "AdminUserCreator");
  const secondaryAuth = ctx.authMod.getAuth(secondaryApp);
  const cred = await ctx.authMod.createUserWithEmailAndPassword(secondaryAuth, userEmail, password);
  const uid = cred.user.uid;
  await ctx.authMod.signOut(secondaryAuth);

  const profile = {
    username: cleanUser,
    email: userEmail,
    fullName: fullName.trim() || cleanUser.toUpperCase(),
    role: role === "admin" ? "admin" : "staff",
    department: department || "General",
    active: true,
    permissions: basePerms,
    createdAt: new Date().toISOString()
  };
  await db.set("users", uid, profile);
  await db.set("usernames", cleanUser, { email: userEmail, uid, active: true });
  await logAudit("CREATE_USER", "Admin", `Created Firebase user ${cleanUser} (${role})`);
  return { id: uid, ...profile };
}

export async function updateUserAccount(uid, updates) {
  requirePermission("manage_users", "edit user accounts & permissions");
  const updated = await db.update("users", uid, updates);
  if (isFirebaseConfigured() && updated?.username && updates.active !== undefined) {
    await db.set("usernames", updated.username, {
      email: updated.email,
      uid,
      active: updates.active
    });
  }
  await logAudit("UPDATE_USER", "Admin", `Updated user ${updated.username}: ${JSON.stringify(Object.keys(updates))}`);
  return updated;
}

export async function resetUserPassword(uid, newPassword) {
  requirePermission("manage_users", "reset user passwords");
  const target = await db.getById("users", uid);
  if (!target) throw new Error("User not found.");

  if (!isFirebaseConfigured()) {
    if (!newPassword || newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    await db.update("users", uid, { passwordHash: await sha256Hex(newPassword) });
    await logAudit("RESET_PASSWORD", "Admin", `Reset password for ${target.username} (Sandbox)`);
    return { method: "local", message: `Password updated for ${target.username}.` };
  }

  const ctx = db.getFirebaseContext();
  if (target.email && !target.email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`)) {
    await ctx.authMod.sendPasswordResetEmail(ctx.auth, target.email);
    await logAudit("RESET_PASSWORD_EMAIL", "Admin", `Sent Firebase password reset email to ${target.email}`);
    return { method: "email", message: `Firebase password reset email sent to ${target.email}.` };
  }
  return {
    method: "console",
    message: `For virtual username account (${target.email}), reset password in Firebase Console -> Authentication -> Users -> Reset Password.`
  };
}

export async function changeOwnPassword(currentPw, newPw) {
  if (!currentUser) throw new Error("Not signed in.");
  if (!newPw || newPw.length < 6) throw new Error("New password must be at least 6 characters.");

  if (!isFirebaseConfigured()) {
    const curHash = await sha256Hex(currentPw);
    const fresh = await db.getById("users", currentUser.id);
    if (!fresh || fresh.passwordHash !== curHash) throw new Error("Current password is incorrect.");
    await db.update("users", currentUser.id, { passwordHash: await sha256Hex(newPw) });
    await logAudit("CHANGE_PASSWORD", "Nalam+", `User ${currentUser.username} changed own password`);
    return true;
  }

  const ctx = db.getFirebaseContext();
  const fbUser = ctx.auth.currentUser;
  const cred = ctx.authMod.EmailAuthProvider.credential(fbUser.email, currentPw);
  await ctx.authMod.reauthenticateWithCredential(fbUser, cred);
  await ctx.authMod.updatePassword(fbUser, newPw);
  await logAudit("CHANGE_PASSWORD", "Nalam+", `User ${currentUser.username} updated Firebase password`);
  return true;
}
