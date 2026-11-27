/**
 * Authentication, Session Auto-Logout & Granular Role-Based Access Control (RBAC)
 */
import * as db from "./db.js";
import { firebaseConfig, USERNAME_EMAIL_DOMAIN, isFirebaseConfigured } from "./firebase-config.js";
import { DEFAULT_ROLE_PERMISSIONS } from "./seed-data.js";

const SESSION_KEY = "curatech_active_session_v2";

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
  if (!permKey || permKey === "app_home" || permKey === "curatech") return true;
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

  // First-time bootstrap fallback for initial admin/staff if Firestore users/{uid} wasn't created yet
  if (!profile) {
    const inferredUsername = email.split("@")[0].toLowerCase();
    const inferredRole = inferredUsername === "kumaran" ? "admin" : "staff";
    profile = {
      id: cred.user.uid,
      username: inferredUsername,
      email,
      fullName: inferredUsername.toUpperCase(),
      role: inferredRole,
      department: inferredRole === "admin" ? "Administration" : "Operations",
      active: true,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS[inferredRole] },
      createdAt: new Date().toISOString()
    };
    if (inferredRole === "admin") {
      await db.set("users", cred.user.uid, profile);
      await db.set("usernames", inferredUsername, { email, uid: cred.user.uid, active: true });
    }
  }

  if (profile.active === false) {
    await ctx.authMod.signOut(ctx.auth);
    throw new Error("Account is deactivated. Contact your hospital administrator.");
  }

  currentUser = profile;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ uid: profile.id, loginAt: Date.now() }));
  await logAudit("LOGIN", "Auth", `User ${profile.username} signed in (Firebase)`);
  return currentUser;
}

export async function restoreSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const { uid } = JSON.parse(raw);
    if (!isFirebaseConfigured()) {
      const user = await db.getById("users", uid);
      if (!user || user.active === false) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      currentUser = user;
      return currentUser;
    }

    const ctx = db.getFirebaseContext();
    const fbUser = await new Promise((resolve) => {
      const unsub = ctx.authMod.onAuthStateChanged(ctx.auth, (u) => {
        unsub();
        resolve(u);
      });
    });
    if (!fbUser) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const profile = await db.getById("users", fbUser.uid);
    if (!profile || profile.active === false) {
      await signOut("Session invalid or account deactivated");
      return null;
    }
    currentUser = profile;
    return currentUser;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function signOut(reason = "User logged off") {
  if (currentUser) {
    await logAudit("LOGOUT", "Auth", `${currentUser.username}: ${reason}`);
  }
  stopAutoLogoutWatchers();
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  if (isFirebaseConfigured()) {
    const ctx = db.getFirebaseContext();
    if (ctx) {
      try { await ctx.authMod.signOut(ctx.auth); } catch { /* ignore */ }
    }
  }
  if (typeof logoutCallback === "function") logoutCallback(reason);
}

export function startAutoLogoutWatchers({ idleMinutes = 15, strictLogoutOnHide = false, onLogout, onTick }) {
  stopAutoLogoutWatchers();
  logoutCallback = onLogout;
  lastActivityAt = Date.now();

  const bump = () => { lastActivityAt = Date.now(); };
  window.__curatechBumpActivity = bump;
  ["mousemove", "keydown", "click", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, bump, { passive: true })
  );

  // When browser tab/window closes, sessionStorage & browserSessionPersistence wipe session.
  // Optional strict mode also signs out immediately if user minimizes/switches away.
  if (strictLogoutOnHide) {
    window.__curatechHideHandler = () => {
      if (document.visibilityState === "hidden" && currentUser) {
        signOut("Auto-logout on leaving application tab");
      }
    };
    document.addEventListener("visibilitychange", window.__curatechHideHandler);
  }

  const timeoutMs = Math.max(1, Number(idleMinutes) || 15) * 60 * 1000;
  idleTimerId = setInterval(() => {
    if (!currentUser) return;
    const elapsed = Date.now() - lastActivityAt;
    const remainingSec = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
    if (typeof onTick === "function") onTick(remainingSec);
    if (elapsed >= timeoutMs) {
      signOut("Auto-logout due to inactivity");
    }
  }, 1000);
}

export function stopAutoLogoutWatchers() {
  if (idleTimerId) {
    clearInterval(idleTimerId);
    idleTimerId = null;
  }
  if (window.__curatechBumpActivity) {
    ["mousemove", "keydown", "click", "touchstart"].forEach((ev) =>
      window.removeEventListener(ev, window.__curatechBumpActivity)
    );
  }
  if (window.__curatechHideHandler) {
    document.removeEventListener("visibilitychange", window.__curatechHideHandler);
  }
}

/* -------------------- Admin User Management APIs -------------------- */

export async function createUserAccount({ username, email, fullName, password, role, department, permissions }) {
  requirePermission("manage_users", "create user accounts");
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!cleanUser || !password || password.length < 6) {
    throw new Error("Username is required and password must be at least 6 characters.");
  }
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

  // Firebase mode: use secondary isolated app instance so Admin stays signed in!
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
    await logAudit("CHANGE_PASSWORD", "CuraTech", `User ${currentUser.username} changed own password`);
    return true;
  }

  const ctx = db.getFirebaseContext();
  const fbUser = ctx.auth.currentUser;
  const cred = ctx.authMod.EmailAuthProvider.credential(fbUser.email, currentPw);
  await ctx.authMod.reauthenticateWithCredential(fbUser, cred);
  await ctx.authMod.updatePassword(fbUser, newPw);
  await logAudit("CHANGE_PASSWORD", "CuraTech", `User ${currentUser.username} updated Firebase password`);
  return true;
}
