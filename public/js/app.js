/**
 * Guru Hospital (Nalam+ ERP) — Application Shell, Ribbon Engine & Multi-Tab Workspace Router
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
let sessionStrictOverride = false;
let shellEventsBound = false;

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
    modeBanner.innerHTML = "<strong>Local Offline Sandbox:</strong> Ready for immediate testing. Configure <code>public/js/firebase-config.js</code> when ready to deploy online.";
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
    sessionStrictOverride = Boolean(document.getElementById("login-strict-exit")?.checked);
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
      btn.textContent = "Sign In to Guru Hospital ERP";
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
    `${settings.hospitalName || "Guru Hospital — Nalam+"} (${formatOperationalDate()})`;
  document.getElementById("welcome-user-text").textContent =
    `Welcome ${String(user.fullName || user.username).toUpperCase()}`;

  const roleBadge = document.getElementById("user-role-badge");
  roleBadge.textContent = user.role.toUpperCase();
  roleBadge.className = `role-badge ${user.role === "admin" ? "admin" : "staff"}`;

  auth.startAutoLogoutWatchers({
    idleMinutes: settings.autoLogoutMinutes || 15,
    strictLogoutOnHide: Boolean(settings.strictLogoutOnHide || sessionStrictOverride),
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
  if (reason && reason !== "User logged off" && reason !== "User clicked Log Off") {
    toast(reason, "warn");
  }
}

function bindShellEvents() {
  if (shellEventsBound) return;
  shellEventsBound = true;

  document.getElementById("header-logout-btn").onclick = () => auth.signOut("User logged off");
  document.getElementById("header-toggle-ribbon").onclick = () => {
    document.getElementById("ribbon-toolbar").classList.toggle("collapsed");
  };
  document.getElementById("app-home-btn").onclick = () => {
    activeRibbonTab = "app_home";
    document.getElementById("ribbon-toolbar").classList.remove("collapsed");
    renderRibbonChrome();
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ribbon-dropdown") && !e.target.closest("[data-has-dd]")) {
      elDropdown.classList.add("hidden");
    }
  });
}

function selectRibbonTab(tabId) {
  const tabDef = RIBBON_TABS.find((t) => t.id === tabId);
  if (tabDef && !auth.hasPermission(tabDef.perm)) {
    toast(`Access Restricted: "${tabDef.label}" requires Admin permission.`, "error");
    return false;
  }
  activeRibbonTab = tabId;
  document.getElementById("ribbon-toolbar").classList.remove("collapsed");
  renderRibbonChrome();
  return true;
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
    btn.onclick = () => selectRibbonTab(btn.dataset.rtab);
  });

  // Sync mobile quick department switcher
  const mobileSel = document.getElementById("mobile-dept-select");
  if (mobileSel) {
    mobileSel.innerHTML = RIBBON_TABS.map((tab) => {
      const allowed = auth.hasPermission(tab.perm);
      return `<option value="${esc(tab.id)}" ${tab.id === activeRibbonTab ? "selected" : ""} ${allowed ? "" : "disabled"}>${esc(tab.label)}${allowed ? "" : " (Restricted)"}</option>`;
    }).join("");
    mobileSel.onchange = (e) => {
      if (!selectRibbonTab(e.target.value)) {
        e.target.value = activeRibbonTab;
      }
    };
  }

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
  elDropdown.classList.remove("hidden");

  const ddWidth = Math.min(240, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - ddWidth - 8));
  const top = Math.min(rect.bottom + 4, window.innerHeight - 160);
  elDropdown.style.left = `${left}px`;
  elDropdown.style.top = `${top}px`;

  elDropdown.querySelectorAll(".ribbon-dropdown-item").forEach((el) => {
    el.onclick = () => {
      const it = items[Number(el.dataset.ddIdx)];
      if (it.perm && !auth.hasPermission(it.perm)) {
        return toast(`Restricted: ${it.label} requires Admin permission.`, "error");
      }
      elDropdown.classList.add("hidden");
      openWorkspaceView(it.viewId, it.label, it.params || {});
    };
  });
}

export function openWorkspaceView(viewId, title, params = {}) {
  const key = `${viewId}::${JSON.stringify(params)}`;
  const existing = openWorkspaceTabs.find((t) => t.key === key);
  if (!existing) {
    openWorkspaceTabs.push({ key, viewId, title, params });
    if (openWorkspaceTabs.length > 9) openWorkspaceTabs.shift();
  }
  activeWorkspaceKey = key;
  renderWorkspaceTabs();
  renderActiveWorkspaceContent();
}

function renderWorkspaceTabs() {
  const bar = document.getElementById("workspace-tabs");
  bar.innerHTML = openWorkspaceTabs.map((tab) => `
    <div class="ws-tab ${tab.key === activeWorkspaceKey ? "active" : ""}" data-wkey="${esc(tab.key)}">
      <span>${esc(tab.title)}</span>
      <button type="button" class="ws-tab-close" data-wclose="${esc(tab.key)}" title="Close Tab">&times;</button>
    </div>
  `).join("");

  bar.querySelectorAll(".ws-tab").forEach((el) => {
    el.onclick = (e) => {
      const closeKey = e.target.dataset?.wclose;
      if (closeKey) {
        openWorkspaceTabs = openWorkspaceTabs.filter((t) => t.key !== closeKey);
        if (activeWorkspaceKey === closeKey) {
          activeWorkspaceKey = openWorkspaceTabs[openWorkspaceTabs.length - 1]?.key || null;
        }
        renderWorkspaceTabs();
        renderActiveWorkspaceContent();
        return;
      }
      activeWorkspaceKey = el.dataset.wkey;
      renderWorkspaceTabs();
      renderActiveWorkspaceContent();
    };
  });
}

async function renderActiveWorkspaceContent() {
  const body = document.getElementById("workspace-body");
  const current = openWorkspaceTabs.find((t) => t.key === activeWorkspaceKey);
  if (!current) {
    body.innerHTML = `<div class="card"><h3 class="card-title">Guru Hospital — Nalam+ Workspace</h3><p>Select any action button from the ribbon toolbar above to open a module tab.</p></div>`;
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
