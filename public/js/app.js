/**
 * CuraTech Hospital Management — Application Shell, Ribbon Engine & Multi-Tab Workspace Router
 */
import * as db from "./db.js";
import * as auth from "./auth.js";
import { RIBBON_TABS, RIBBON_CONFIG } from "./ribbon-config.js";
import { esc, formatOperationalDate, getRibbonIconSvg, toast } from "./ui.js";

import { renderAdminView } from "./modules/admin.js";
import { renderPatientView } from "./modules/patient.js";
import { renderDoctorView } from "./modules/doctor.js";
import { renderLabView } from "./modules/lab.js";
import { renderPharmacyView } from "./modules/pharmacy.js";
import { renderCashierView } from "./modules/cashier.js";
import { renderAccountsView } from "./modules/accounts.js";
import { renderMasterCatalogView } from "./modules/masters.js";
import { renderEnterpriseReport } from "./modules/reports.js";
import { renderOperationsView } from "./modules/operations.js";

let activeRibbonTab = "app_home";
let openWorkspaceTabs = [];
let activeWorkspaceKey = null;

const elLoginScreen = document.getElementById("login-screen");
const elAppShell = document.getElementById("app-shell");
const elLoginForm = document.getElementById("login-form");
const elLoginError = document.getElementById("login-error");
const elDropdown = document.getElementById("ribbon-dropdown");

function formatClockSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `Auto-lock ${m}:${String(s).padStart(2, "0")}`;
}

async function boot() {
  const { mode } = await db.initDatabase();
  const modeBanner = document.getElementById("login-mode-banner");
  const connPill = document.getElementById("connection-pill");

  if (mode === "firebase") {
    modeBanner.classList.add("live");
    modeBanner.innerHTML = "<strong>Firebase Cloud Live:</strong> Connected to Firebase Authentication &amp; Cloud Firestore.";
    connPill.classList.add("live");
    connPill.textContent = "Firebase Live";
  } else {
    modeBanner.innerHTML = "<strong>Local Offline Sandbox:</strong> Ready for immediate testing. Configure <code>js/firebase-config.js</code> when ready to deploy online.";
    connPill.textContent = "Local Sandbox";
  }

  document.getElementById("toggle-password-btn").onclick = () => {
    const pw = document.getElementById("login-password");
    const btn = document.getElementById("toggle-password-btn");
    const isPw = pw.type === "password";
    pw.type = isPw ? "text" : "password";
    btn.textContent = isPw ? "Hide" : "Show";
  };

  elLoginForm.onsubmit = async (e) => {
    e.preventDefault();
    elLoginError.classList.add("hidden");
    const btn = document.getElementById("login-submit-btn");
    btn.disabled = true;
    btn.textContent = "Signing in...";
    try {
      const user = await auth.signIn(
        document.getElementById("login-username").value,
        document.getElementById("login-password").value
      );
      elLoginForm.reset();
      await enterWorkspace(user);
    } catch (err) {
      elLoginError.textContent = err.message;
      elLoginError.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In to CuraTech ERP";
    }
  };

  const restored = await auth.restoreSession();
  if (restored) {
    await enterWorkspace(restored);
  }
}

async function enterWorkspace(user) {
  elLoginScreen.classList.add("hidden");
  elAppShell.classList.remove("hidden");

  const settings = await db.getHospitalSettings();
  document.getElementById("header-brand-title").textContent =
    `${settings.hospitalName || "CuraTech Hospital Management"} (${formatOperationalDate()})`;
  document.getElementById("welcome-user-text").textContent =
    `Welcome ${String(user.fullName || user.username).toUpperCase()}`;

  const roleBadge = document.getElementById("user-role-badge");
  roleBadge.textContent = user.role.toUpperCase();
  roleBadge.className = `role-badge ${user.role === "admin" ? "admin" : "staff"}`;

  auth.startAutoLogoutWatchers({
    idleMinutes: settings.autoLogoutMinutes || 15,
    strictLogoutOnHide: Boolean(settings.strictLogoutOnHide),
    onTick: (sec) => {
      const pill = document.getElementById("idle-timer-pill");
      if (pill) pill.textContent = formatClockSeconds(sec);
    },
    onLogout: (reason) => {
      showLoginScreen(reason);
    }
  });

  bindShellEvents();
  activeRibbonTab = "app_home";
  openWorkspaceTabs = [];
  renderRibbonChrome();
  openWorkspaceView("exec_dashboard", "Dashboard", {});
}

function showLoginScreen(reason) {
  elAppShell.classList.add("hidden");
  elLoginScreen.classList.remove("hidden");
  elDropdown.classList.add("hidden");
  openWorkspaceTabs = [];
  activeWorkspaceKey = null;
  if (reason && reason !== "User logged off") {
    toast(reason, "warn");
  }
}

function bindShellEvents() {
  document.getElementById("header-logout-btn").onclick = () => auth.signOut("User logged off");
  document.getElementById("header-toggle-ribbon").onclick = () => {
    document.getElementById("ribbon-toolbar").classList.toggle("collapsed");
  };
  document.getElementById("app-home-btn").onclick = () => {
    activeRibbonTab = "app_home";
    renderRibbonChrome();
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ribbon-dropdown") && !e.target.closest("[data-has-dd]")) {
      elDropdown.classList.add("hidden");
    }
  });
}

function renderRibbonChrome() {
  const appBtn = document.getElementById("app-home-btn");
  appBtn.classList.toggle("active", activeRibbonTab === "app_home");

  const tabsContainer = document.getElementById("ribbon-tabs-scroll");
  tabsContainer.innerHTML = RIBBON_TABS.filter((t) => !t.isAppButton).map((tab) => {
    const allowed = auth.hasPermission(tab.perm);
    const activeCls = activeRibbonTab === tab.id ? "active" : "";
    const lockCls = allowed ? "" : "locked";
    return `<button type="button" class="ribbon-tab ${activeCls} ${lockCls}" data-rtab="${esc(tab.id)}" title="${allowed ? tab.label : "Restricted — Admin permission required"}">${esc(tab.label)}${allowed ? "" : " 🔒"}</button>`;
  }).join("");

  tabsContainer.querySelectorAll(".ribbon-tab").forEach((btn) => {
    btn.onclick = () => {
      const tabId = btn.dataset.rtab;
      const tabDef = RIBBON_TABS.find((t) => t.id === tabId);
      if (tabDef && !auth.hasPermission(tabDef.perm)) {
        return toast(`Access Restricted: "${tabDef.label}" requires Admin permission.`, "error");
      }
      activeRibbonTab = tabId;
      document.getElementById("ribbon-toolbar").classList.remove("collapsed");
      renderRibbonChrome();
    };
  });

  renderRibbonSections(activeRibbonTab);
}

function renderRibbonSections(tabId) {
  const sections = RIBBON_CONFIG[tabId] || [];
  const slot = document.getElementById("ribbon-sections");

  const renderCommand = (item, isSmall) => {
    const allowed = !item.perm || auth.hasPermission(item.perm);
    const lockCls = allowed ? "" : "rb-locked";
    const cls = isSmall ? `rb-small-btn ${lockCls}` : `rb-large-btn ${lockCls}`;
    const caret = item.type === "dropdown" ? `<span class="rb-caret">▼</span>` : "";
    const ddAttr = item.type === "dropdown" ? `data-has-dd="1"` : "";
    const payload = esc(JSON.stringify(item));
    return `
      <button type="button" class="${cls}" ${ddAttr} data-cmd='${payload}' title="${allowed ? item.label : "Restricted by RBAC"}">
        ${getRibbonIconSvg(item.icon, item.tone)}
        <span>${esc(item.label)}${caret}</span>
      </button>
    `;
  };

  slot.innerHTML = sections.map((sec) => `
    <div class="ribbon-group">
      <div class="ribbon-group-items">
        ${sec.items.map((entry) => {
          if (entry.kind === "stack") {
            return `<div class="rb-stack-col">${entry.rows.map((r) => renderCommand(r, true)).join("")}</div>`;
          }
          return renderCommand(entry, false);
        }).join("")}
      </div>
      ${sec.label ? `<div class="ribbon-group-label">${esc(sec.label)}</div>` : `<div class="ribbon-group-label">&nbsp;</div>`}
    </div>
  `).join("");

  slot.querySelectorAll("button[data-cmd]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const cmd = JSON.parse(btn.dataset.cmd);
      if (cmd.perm && !auth.hasPermission(cmd.perm)) {
        return toast(`Permission required: ${cmd.label} is restricted for your role.`, "error");
      }
      if (cmd.type === "dropdown") {
        openRibbonDropdown(btn, cmd.items || []);
      } else {
        elDropdown.classList.add("hidden");
        if (cmd.viewId === "action_logoff") {
          auth.signOut("User clicked Log Off");
          return;
        }
        openWorkspaceView(cmd.viewId, cmd.label, cmd.params || {});
      }
    };
  });
}

function openRibbonDropdown(anchorEl, items) {
  const rect = anchorEl.getBoundingClientRect();
  elDropdown.innerHTML = items.map((it, idx) => {
    const allowed = !it.perm || auth.hasPermission(it.perm);
    return `<button type="button" class="ribbon-dropdown-item ${allowed ? "" : "rb-locked"}" data-dd-idx="${idx}"><span>${esc(it.label)}</span>${allowed ? "" : "<span>🔒</span>"}</button>`;
  }).join("");
  elDropdown.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
  elDropdown.style.top = `${rect.bottom + 3}px`;
  elDropdown.classList.remove("hidden");

  elDropdown.querySelectorAll(".ribbon-dropdown-item").forEach((itemBtn) => {
    itemBtn.onclick = () => {
      const it = items[Number(itemBtn.dataset.ddIdx)];
      elDropdown.classList.add("hidden");
      if (it.perm && !auth.hasPermission(it.perm)) {
        return toast(`Restricted: ${it.label} requires elevated permission.`, "error");
      }
      openWorkspaceView(it.viewId, it.label, it.params || {});
    };
  });
}

function makeTabKey(viewId, params) {
  return `${viewId}::${JSON.stringify(params || {})}`;
}

export async function openWorkspaceView(viewId, title, params = {}) {
  const key = makeTabKey(viewId, params);
  const existing = openWorkspaceTabs.find((t) => t.key === key);
  if (!existing) {
    openWorkspaceTabs.push({ key, viewId, title, params });
  }
  activeWorkspaceKey = key;
  renderWorkspaceTabs();
  await renderActiveWorkspaceContent();
}

function renderWorkspaceTabs() {
  const bar = document.getElementById("workspace-tabs");
  bar.innerHTML = openWorkspaceTabs.map((t) => `
    <div class="ws-tab ${t.key === activeWorkspaceKey ? "active" : ""}" data-ws-key="${esc(t.key)}">
      <span>${esc(t.title)}</span>
      ${openWorkspaceTabs.length > 1 ? `<button type="button" class="ws-tab-close" data-ws-close="${esc(t.key)}" title="Close tab">×</button>` : ""}
    </div>
  `).join("");

  bar.querySelectorAll(".ws-tab").forEach((tabEl) => {
    tabEl.onclick = async (e) => {
      const closeBtn = e.target.closest("button[data-ws-close]");
      if (closeBtn) {
        const k = closeBtn.dataset.wsClose;
        openWorkspaceTabs = openWorkspaceTabs.filter((x) => x.key !== k);
        if (activeWorkspaceKey === k && openWorkspaceTabs.length) {
          activeWorkspaceKey = openWorkspaceTabs[openWorkspaceTabs.length - 1].key;
        }
        renderWorkspaceTabs();
        await renderActiveWorkspaceContent();
        return;
      }
      activeWorkspaceKey = tabEl.dataset.wsKey;
      renderWorkspaceTabs();
      await renderActiveWorkspaceContent();
    };
  });
}

async function renderActiveWorkspaceContent() {
  const body = document.getElementById("workspace-body");
  const current = openWorkspaceTabs.find((t) => t.key === activeWorkspaceKey);
  if (!current) {
    body.innerHTML = "";
    return;
  }

  const { viewId, params } = current;
  body.innerHTML = `<div class="alert alert-info">Loading ${esc(current.title)}...</div>`;

  try {
    if (viewId.startsWith("admin_")) {
      await renderAdminView(viewId, body);
    } else if (
      viewId.startsWith("patient_") || viewId.startsWith("op_") || viewId.startsWith("ip_") ||
      viewId === "related_patients" || viewId === "room_management" || viewId === "test_enquiry" ||
      viewId === "alerts_queue" || viewId === "send_sms" || viewId === "duty_allotment"
    ) {
      await renderPatientView(viewId, body, params);
    } else if (viewId.startsWith("doc_")) {
      await renderDoctorView(viewId, body);
    } else if (viewId.startsWith("lab_")) {
      await renderLabView(viewId, body, params);
    } else if (viewId.startsWith("pharma_")) {
      await renderPharmacyView(viewId, body, params);
    } else if (viewId.startsWith("cashier_")) {
      await renderCashierView(viewId, body, params);
    } else if (viewId.startsWith("acc_")) {
      await renderAccountsView(viewId, body, params);
    } else if (viewId === "master_catalog") {
      await renderMasterCatalogView(params.catalog || "Medicine", body);
    } else if (viewId === "ent_report") {
      await renderEnterpriseReport(params.report || "Visit Details", body);
    } else {
      await renderOperationsView(viewId, body, params, openWorkspaceView);
    }
  } catch (err) {
    body.innerHTML = `<div class="alert alert-error"><strong>${esc(err.message)}</strong></div>`;
    toast(err.message, "error");
  }
}

boot();
