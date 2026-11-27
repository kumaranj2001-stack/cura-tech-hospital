/**
 * See Curavite Hospital Management — Application Shell, Collapsible Side Hamburger Menu & Multi-Tab Workspace Router
 */
import * as db from "./db.js";
import * as auth from "./auth.js";
import { RIBBON_TABS, buildDepartmentMenuSections } from "./ribbon-config.js";
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

const expandedDepts = new Set(["app_home"]);
const expandedSubMenus = new Set();
let expandAllMode = false;
let menuSearchQuery = "";
let openWorkspaceTabs = [];
let activeWorkspaceKey = null;
let sessionStrictOverride = false;
let shellEventsBound = false;

const elLoginScreen = document.getElementById("login-screen");
const elAppShell = document.getElementById("app-shell");
const elLoginForm = document.getElementById("login-form");
const elLoginError = document.getElementById("login-error");
const elSideNav = document.getElementById("side-nav");
const elSideBackdrop = document.getElementById("side-backdrop");
const elSideList = document.getElementById("side-nav-list");

function formatClockSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `Auto-lock ${m}:${String(s).padStart(2, "0")}`;
}

function isMobileViewport() {
  return window.innerWidth <= 1024;
}

function closeMobileDrawer() {
  elSideNav?.classList.remove("mobile-open");
  elSideBackdrop?.classList.remove("visible");
}

function toggleHamburgerMenu() {
  if (isMobileViewport()) {
    const opening = !elSideNav.classList.contains("mobile-open");
    elSideNav.classList.toggle("mobile-open", opening);
    elSideBackdrop.classList.toggle("visible", opening);
    document.getElementById("hamburger-toggle-btn")?.setAttribute("aria-expanded", String(opening));
  } else {
    const collapsed = elSideNav.classList.toggle("collapsed");
    document.getElementById("hamburger-toggle-btn")?.setAttribute("aria-expanded", String(!collapsed));
  }
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
      btn.textContent = "Sign In to See Curavite Hospital Management";
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
    `${settings.hospitalName || "See Curavite Hospital Management"} (${formatOperationalDate()})`;
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
  openWorkspaceTabs = [];
  expandedDepts.clear();
  expandedDepts.add("app_home");
  renderSideNavigation();
  openWorkspaceView("exec_dashboard", "Dashboard", {});
}

function showLoginScreen(reason) {
  elAppShell.classList.add("hidden");
  elLoginScreen.classList.remove("hidden");
  closeMobileDrawer();
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
  document.getElementById("hamburger-toggle-btn").onclick = toggleHamburgerMenu;
  elSideBackdrop.onclick = closeMobileDrawer;

  document.getElementById("side-menu-search").oninput = (e) => {
    menuSearchQuery = e.target.value.trim().toLowerCase();
    renderSideNavigation();
  };

  document.getElementById("side-expand-all-btn").onclick = (e) => {
    expandAllMode = !expandAllMode;
    e.target.textContent = expandAllMode ? "Collapse All" : "Expand All";
    expandedDepts.clear();
    if (expandAllMode) {
      RIBBON_TABS.forEach((t) => {
        if (auth.hasPermission(t.perm)) expandedDepts.add(t.id);
      });
    } else {
      expandedDepts.add("app_home");
    }
    renderSideNavigation();
  };
}

function countTabCommands(sections) {
  let n = 0;
  for (const s of sections) {
    for (const e of s.entries) {
      if (e.type === "dropdown") n += (e.items || []).length;
      else n += 1;
    }
  }
  return n;
}

function renderSideNavigation() {
  const q = menuSearchQuery;

  const html = RIBBON_TABS.map((tab) => {
    const tabAllowed = auth.hasPermission(tab.perm);
    const sections = buildDepartmentMenuSections(tab.id);
    const totalCount = countTabCommands(sections);

    // Filter sections/items if user typed in sidebar search box
    const filteredSections = sections.map((sec) => {
      const matchedEntries = [];
      for (const entry of sec.entries) {
        if (entry.type === "dropdown") {
          const parentMatch = !q || entry.label.toLowerCase().includes(q) || tab.label.toLowerCase().includes(q);
          const childMatches = (entry.items || []).filter((sub) =>
            !q || parentMatch || sub.label.toLowerCase().includes(q)
          );
          if (childMatches.length > 0) {
            matchedEntries.push({ ...entry, items: childMatches });
          }
        } else if (!q || entry.label.toLowerCase().includes(q) || sec.label.toLowerCase().includes(q) || tab.label.toLowerCase().includes(q)) {
          matchedEntries.push(entry);
        }
      }
      return { ...sec, entries: matchedEntries };
    }).filter((sec) => sec.entries.length > 0);

    if (q && filteredSections.length === 0) return "";

    const isOpen = q ? true : expandedDepts.has(tab.id);
    const bodyHtml = filteredSections.map((sec) => {
      const secTitle = sec.label ? `<div class="side-section-label">${esc(sec.label)}</div>` : "";
      const itemsHtml = sec.entries.map((entry, idx) => {
        if (entry.type === "dropdown") {
          const subKey = `${tab.id}::${sec.label}::${entry.label}::${idx}`;
          const subAllowed = !entry.perm || auth.hasPermission(entry.perm);
          const subOpen = q ? true : expandedSubMenus.has(subKey);
          const subRowsHtml = (entry.items || []).map((sub) => {
            const itemAllowed = subAllowed && (!sub.perm || auth.hasPermission(sub.perm));
            const cmdKey = `${sub.viewId}::${JSON.stringify(sub.params || {})}`;
            const activeCls = activeWorkspaceKey === cmdKey ? "active" : "";
            const payload = esc(JSON.stringify(sub));
            return `
              <button type="button" class="side-item-btn ${activeCls} ${itemAllowed ? "" : "locked"}" data-side-cmd='${payload}'>
                <span class="side-item-label">${esc(sub.label)}</span>
                ${itemAllowed ? "" : "<span>🔒</span>"}
              </button>
            `;
          }).join("");

          return `
            <div class="side-sub-group ${subOpen ? "open" : ""}">
              <button type="button" class="side-sub-toggle ${subAllowed ? "" : "locked"}" data-sub-toggle="${esc(subKey)}" data-sub-perm="${esc(entry.perm || "")}">
                ${getRibbonIconSvg(entry.icon, entry.tone)}
                <span class="side-item-label">${esc(entry.label)}</span>
                ${subAllowed ? "" : "<span>🔒</span>"}
                <span class="side-sub-caret">&#9654;</span>
              </button>
              <div class="side-sub-items">${subRowsHtml}</div>
            </div>
          `;
        }

        const allowed = !entry.perm || auth.hasPermission(entry.perm);
        const cmdKey = `${entry.viewId}::${JSON.stringify(entry.params || {})}`;
        const activeCls = activeWorkspaceKey === cmdKey ? "active" : "";
        const payload = esc(JSON.stringify(entry));
        return `
          <button type="button" class="side-item-btn ${activeCls} ${allowed ? "" : "locked"}" data-side-cmd='${payload}'>
            ${getRibbonIconSvg(entry.icon, entry.tone)}
            <span class="side-item-label">${esc(entry.label)}</span>
            ${allowed ? "" : "<span>🔒</span>"}
          </button>
        `;
      }).join("");

      return `${secTitle}${itemsHtml}`;
    }).join("");

    return `
      <div class="side-dept ${isOpen ? "open" : ""} ${tabAllowed ? "" : "locked"}" data-dept="${esc(tab.id)}">
        <button type="button" class="side-dept-btn" data-dept-toggle="${esc(tab.id)}" title="${esc(tab.label)}">
          <span class="side-dept-icon" style="--dept-glow:${tab.glow};">
            ${getRibbonIconSvg(tab.icon, "blue")}
          </span>
          <span class="side-dept-label">${esc(tab.label)}</span>
          ${tabAllowed ? `<span class="side-dept-count">${totalCount}</span>` : `<span>🔒</span>`}
          <span class="side-dept-chevron">&#9654;</span>
        </button>
        <div class="side-dept-body">${bodyHtml}</div>
      </div>
    `;
  }).join("");

  elSideList.innerHTML = html || `<div style="padding:14px;color:#94a3b8;font-size:12px;">No menu options match "${esc(menuSearchQuery)}".</div>`;

  // Department accordion handlers
  elSideList.querySelectorAll("[data-dept-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const deptId = btn.dataset.deptToggle;
      const tabDef = RIBBON_TABS.find((t) => t.id === deptId);
      if (tabDef && !auth.hasPermission(tabDef.perm)) {
        return toast(`Access Restricted: "${tabDef.label}" requires Admin permission.`, "error");
      }

      // If desktop sidebar was collapsed to icon-rail, expand it first
      if (!isMobileViewport() && elSideNav.classList.contains("collapsed")) {
        elSideNav.classList.remove("collapsed");
        document.getElementById("hamburger-toggle-btn")?.setAttribute("aria-expanded", "true");
        expandedDepts.add(deptId);
      } else if (expandedDepts.has(deptId)) {
        expandedDepts.delete(deptId);
      } else {
        expandedDepts.add(deptId);
      }
      renderSideNavigation();
    };
  });

  // Nested dropdown submenu toggle handlers
  elSideList.querySelectorAll("[data-sub-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const perm = btn.dataset.subPerm;
      if (perm && !auth.hasPermission(perm)) {
        return toast("Permission required: Restricted for your role.", "error");
      }
      const key = btn.dataset.subToggle;
      if (expandedSubMenus.has(key)) expandedSubMenus.delete(key);
      else expandedSubMenus.add(key);
      renderSideNavigation();
    };
  });

  // Leaf menu action handlers
  elSideList.querySelectorAll("[data-side-cmd]").forEach((btn) => {
    btn.onclick = () => {
      const cmd = JSON.parse(btn.dataset.sideCmd);
      if (cmd.perm && !auth.hasPermission(cmd.perm)) {
        return toast(`Permission required: ${cmd.label} is restricted for your role.`, "error");
      }
      if (cmd.viewId === "action_logoff") {
        auth.signOut("User clicked Log Off");
        return;
      }
      openWorkspaceView(cmd.viewId, cmd.label, cmd.params || {});
      if (isMobileViewport()) closeMobileDrawer();
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
  renderSideNavigation();
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
        renderSideNavigation();
        renderActiveWorkspaceContent();
        return;
      }
      activeWorkspaceKey = el.dataset.wkey;
      renderWorkspaceTabs();
      renderSideNavigation();
      renderActiveWorkspaceContent();
    };
  });
}

async function renderActiveWorkspaceContent() {
  const body = document.getElementById("workspace-body");
  const current = openWorkspaceTabs.find((t) => t.key === activeWorkspaceKey);
  if (!current) {
    body.innerHTML = `<div class="card"><h3 class="card-title">See Curavite Hospital Management</h3><p>Open the side hamburger menu on the left to choose any department module or report.</p></div>`;
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
