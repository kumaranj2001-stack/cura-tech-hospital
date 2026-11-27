/**
 * Admin Module: User Management, RBAC Permissions Matrix, GRN Approvals,
 * System Settings, Security Audit Trail, Leave Approvals & Support Tickets.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../seed-data.js";
import { esc, mountDataTable, openModal, closeModal, toast } from "../ui.js";

export async function renderAdminView(viewId, container) {
  switch (viewId) {
    case "admin_users":
      return renderUserManagement(container);
    case "admin_grn_approvals":
      return renderGrnApprovals(container);
    case "admin_settings":
      return renderSystemSettings(container);
    case "admin_audit":
      return renderAuditTrail(container);
    case "admin_leaves":
      return renderLeaveApprovals(container);
    case "admin_tickets":
      return renderSupportInbox(container);
    default:
      return renderUserManagement(container);
  }
}

async function renderUserManagement(container) {
  auth.requirePermission("manage_users", "manage user accounts");
  const users = await db.list("users");

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Admin User Management &amp; Role-Based Access Control</h2>
        <p>Create staff/admin accounts, assign roles, edit granular permissions, reset passwords, and activate/deactivate users.</p>
      </div>
      <div class="module-actions">
        <button type="button" class="btn btn-primary" id="btn-new-user">+ Create New User</button>
      </div>
    </div>
    <div class="card">
      <div id="users-table-wrap"></div>
    </div>
  `;

  mountDataTable(container.querySelector("#users-table-wrap"), {
    columns: [
      { key: "username", label: "Username", render: (u) => `<strong>${esc(u.username)}</strong>` },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email / Login ID" },
      { key: "department", label: "Department" },
      { key: "role", label: "Role", render: (u) => `<span class="badge ${u.role === "admin" ? "badge-blue" : "badge-green"}">${esc(u.role.toUpperCase())}</span>` },
      { key: "active", label: "Status", render: (u) => `<span class="badge ${u.active !== false ? "badge-green" : "badge-red"}">${u.active !== false ? "Active" : "Deactivated"}</span>` },
      {
        key: "actions",
        label: "Actions",
        noExport: true,
        render: (u) => `
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-sm" data-act="perms" data-uid="${esc(u.id)}">Permissions</button>
            <button class="btn btn-sm" data-act="reset" data-uid="${esc(u.id)}">Reset PW</button>
            <button class="btn btn-sm ${u.active !== false ? "btn-danger" : "btn-success"}" data-act="toggle" data-uid="${esc(u.id)}">
              ${u.active !== false ? "Deactivate" : "Activate"}
            </button>
          </div>
        `
      }
    ],
    rows: users,
    searchPlaceholder: "Search users by username, name, role...",
    exportFileName: "curatech-users.csv"
  });

  container.querySelector("#btn-new-user").onclick = () => openCreateUserModal(() => renderUserManagement(container));

  container.querySelector("#users-table-wrap").onclick = async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const uid = btn.dataset.uid;
    const act = btn.dataset.act;
    const target = users.find((u) => u.id === uid);
    if (!target) return;

    if (act === "toggle") {
      if (target.username === auth.getCurrentUser().username) {
        return toast("You cannot deactivate your own active Admin account.", "error");
      }
      await auth.updateUserAccount(uid, { active: target.active === false });
      toast(`Account ${target.username} ${target.active === false ? "activated" : "deactivated"}.`, "success");
      renderUserManagement(container);
    } else if (act === "perms") {
      openPermissionsModal(target, () => renderUserManagement(container));
    } else if (act === "reset") {
      openResetPasswordModal(target);
    }
  };
}

function buildPermissionCheckboxesHtml(selectedPerms = {}) {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px;max-height:240px;overflow-y:auto;border:1px solid var(--border);padding:10px;border-radius:6px;background:var(--surface-alt);">
      ${auth.PERMISSION_LABELS.map((p) => `
        <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;">
          <input type="checkbox" class="perm-chk" value="${esc(p.key)}" ${selectedPerms[p.key] ? "checked" : ""} />
          <span>${esc(p.label)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function openCreateUserModal(onDone) {
  openModal({
    title: "Create New Hospital User",
    width: "760px",
    bodyHtml: `
      <form id="create-user-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Username *</label>
            <input name="username" required placeholder="e.g. nurse_meena" />
          </div>
          <div class="form-group">
            <label>Full Name *</label>
            <input name="fullName" required placeholder="e.g. Meena Kumari" />
          </div>
          <div class="form-group">
            <label>Email (optional for username login)</label>
            <input name="email" type="email" placeholder="Auto: username@curatech.hospital" />
          </div>
          <div class="form-group">
            <label>Initial Password (min 6 chars) *</label>
            <input name="password" type="password" minlength="6" required placeholder="Set initial password" />
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select name="role" id="cu-role">
              <option value="staff">Staff (Restricted)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <input name="department" value="Front Office / Pharmacy" />
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Feature Permissions</label>
          <div id="cu-perms-slot">${buildPermissionCheckboxesHtml(DEFAULT_ROLE_PERMISSIONS.staff)}</div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Create User Account</button>
        </div>
      </form>
    `,
    onMount: (slot) => {
      const roleSel = slot.querySelector("#cu-role");
      const permsSlot = slot.querySelector("#cu-perms-slot");
      roleSel.onchange = () => {
        permsSlot.innerHTML = buildPermissionCheckboxesHtml(DEFAULT_ROLE_PERMISSIONS[roleSel.value]);
      };
      slot.querySelector("#create-user-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const permissions = { app_home: true, curatech: true };
        slot.querySelectorAll(".perm-chk").forEach((chk) => {
          permissions[chk.value] = chk.checked;
        });
        try {
          await auth.createUserAccount({
            username: fd.get("username"),
            fullName: fd.get("fullName"),
            email: fd.get("email"),
            password: fd.get("password"),
            role: fd.get("role"),
            department: fd.get("department"),
            permissions
          });
          toast("User account created successfully.", "success");
          closeModal();
          onDone();
        } catch (err) {
          toast(err.message, "error");
        }
      };
    }
  });
}

function openPermissionsModal(user, onDone) {
  openModal({
    title: `Edit Role & Permissions: ${user.username}`,
    width: "760px",
    bodyHtml: `
      <form id="edit-perms-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Full Name</label>
            <input name="fullName" value="${esc(user.fullName)}" required />
          </div>
          <div class="form-group">
            <label>Department</label>
            <input name="department" value="${esc(user.department || "")}" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <select name="role" id="ep-role">
              <option value="staff" ${user.role === "staff" ? "selected" : ""}>Staff</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Module &amp; Security Permissions</label>
          <div id="ep-perms-slot">${buildPermissionCheckboxesHtml(user.permissions || {})}</div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Permissions</button>
          <button type="button" class="btn" id="ep-preset-btn">Apply Role Defaults</button>
        </div>
      </form>
    `,
    onMount: (slot) => {
      slot.querySelector("#ep-preset-btn").onclick = () => {
        const r = slot.querySelector("#ep-role").value;
        slot.querySelector("#ep-perms-slot").innerHTML = buildPermissionCheckboxesHtml(DEFAULT_ROLE_PERMISSIONS[r]);
      };
      slot.querySelector("#edit-perms-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const permissions = { app_home: true, curatech: true };
        slot.querySelectorAll(".perm-chk").forEach((chk) => {
          permissions[chk.value] = chk.checked;
        });
        await auth.updateUserAccount(user.id, {
          fullName: fd.get("fullName"),
          department: fd.get("department"),
          role: fd.get("role"),
          permissions
        });
        toast("User permissions updated.", "success");
        closeModal();
        onDone();
      };
    }
  });
}

function openResetPasswordModal(user) {
  openModal({
    title: `Reset Password: ${user.username}`,
    width: "460px",
    bodyHtml: `
      <form id="reset-pw-form">
        <div class="alert alert-info">
          In <strong>Local Sandbox</strong>, this sets a new password immediately. In <strong>Firebase</strong>, real emails receive a reset link.
        </div>
        <div class="form-group">
          <label>New Password (min 6 chars)</label>
          <input name="newPassword" type="password" minlength="6" placeholder="Enter new password (Sandbox)" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-warning">Reset Password</button>
        </div>
      </form>
    `,
    onMount: (slot) => {
      slot.querySelector("#reset-pw-form").onsubmit = async (e) => {
        e.preventDefault();
        const pw = new FormData(e.target).get("newPassword");
        try {
          const res = await auth.resetUserPassword(user.id, pw);
          toast(res.message, "success");
          closeModal();
        } catch (err) {
          toast(err.message, "error");
        }
      };
    }
  });
}

async function renderGrnApprovals(container) {
  auth.requirePermission("approve_grn", "approve GRN entries");
  const [pharmaGrns, storeGrns] = await Promise.all([
    db.list("pharmacy_purchases"),
    db.list("store_purchases")
  ]);

  const combined = [
    ...pharmaGrns.map((g) => ({ ...g, sourceCol: "pharmacy_purchases", dept: "Pharmacy" })),
    ...storeGrns.map((g) => ({ ...g, sourceCol: "store_purchases", dept: "General Store" }))
  ];

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>GRN Entry Approval Queue (Admin Only)</h2>
        <p>Staff can draft Purchase/GRN invoices, and only Admin users can approve them to update live stock.</p>
      </div>
    </div>
    <div class="card">
      <div id="grn-table-wrap"></div>
    </div>
  `;

  mountDataTable(container.querySelector("#grn-table-wrap"), {
    columns: [
      { key: "id", label: "GRN ID" },
      { key: "dept", label: "Department" },
      { key: "grnDate", label: "Date" },
      { key: "invoiceNo", label: "Invoice No" },
      { key: "supplier", label: "Supplier" },
      { key: "netTotal", label: "Net Amount", render: (g) => `₹${Number(g.netTotal || 0).toFixed(2)}` },
      { key: "enteredBy", label: "Entered By" },
      {
        key: "status",
        label: "Status",
        render: (g) => {
          const cls = g.status === "Approved" ? "badge-green" : g.status === "Rejected" ? "badge-red" : "badge-amber";
          return `<span class="badge ${cls}">${esc(g.status)}</span>`;
        }
      },
      {
        key: "act",
        label: "Action",
        noExport: true,
        render: (g) => g.status === "Pending Approval"
          ? `<div style="display:flex;gap:4px;">
               <button class="btn btn-sm btn-success" data-act="approve" data-col="${esc(g.sourceCol)}" data-id="${esc(g.id)}">Approve &amp; Post Stock</button>
               <button class="btn btn-sm btn-danger" data-act="reject" data-col="${esc(g.sourceCol)}" data-id="${esc(g.id)}">Reject</button>
             </div>`
          : `<span style="color:var(--text-muted);font-size:11px;">By ${esc(g.approvedBy || "-")}</span>`
      }
    ],
    rows: combined,
    searchPlaceholder: "Search GRN ID, supplier, invoice...",
    exportFileName: "grn-approvals.csv"
  });

  container.querySelector("#grn-table-wrap").onclick = async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const { act, col, id } = btn.dataset;
    const grn = combined.find((g) => g.id === id && g.sourceCol === col);
    if (!grn) return;

    const approver = auth.getCurrentUser().username;
    if (act === "reject") {
      await db.update(col, id, { status: "Rejected", approvedBy: approver });
      await auth.logAudit("REJECT_GRN", "Admin", `Rejected GRN ${id}`);
      toast(`GRN ${id} rejected.`, "warn");
      return renderGrnApprovals(container);
    }

    // Approve & Apply items to stock
    if (col === "pharmacy_purchases") {
      const meds = await db.list("medicines");
      for (const item of grn.items || []) {
        const existing = meds.find((m) => m.id === item.medId || m.name === item.medName);
        if (existing) {
          await db.update("medicines", existing.id, {
            stock: Number(existing.stock || 0) + Number(item.qty || 0),
            batchNo: item.batchNo || existing.batchNo,
            expiry: item.expiry || existing.expiry,
            purchaseRate: Number(item.rate || existing.purchaseRate),
            mrp: Number(item.mrp || existing.mrp)
          });
        } else {
          await db.add("medicines", {
            name: item.medName,
            generic: item.medName,
            type: "Tablet",
            manufacturer: grn.supplier,
            hsn: item.hsn || "300490",
            batchNo: item.batchNo || "NEW",
            expiry: item.expiry || "2028-01-01",
            stock: Number(item.qty || 0),
            mrp: Number(item.mrp || 0),
            purchaseRate: Number(item.rate || 0),
            gstPercent: Number(item.gstPercent || 12)
          });
        }
      }
    } else {
      const storeItems = await db.list("store_items");
      for (const item of grn.items || []) {
        const existing = storeItems.find((s) => s.name === item.itemName);
        if (existing) {
          await db.update("store_items", existing.id, { qty: Number(existing.qty || 0) + Number(item.qty || 0) });
        } else {
          await db.add("store_items", { name: item.itemName, category: "General", qty: Number(item.qty || 0), unit: "Nos" });
        }
      }
    }

    await db.update(col, id, { status: "Approved", approvedBy: approver, approvedAt: new Date().toISOString() });
    await auth.logAudit("APPROVE_GRN", "Admin", `Approved GRN ${id} (${grn.dept}) ₹${grn.netTotal}`);
    toast(`GRN ${id} approved and stock updated!`, "success");
    renderGrnApprovals(container);
  };
}

async function renderSystemSettings(container) {
  if (!auth.hasPermission("admin") && !auth.hasPermission("manage_inventory_settings")) {
    throw new Error("Access Denied: Admin or Inventory Settings permission required.");
  }
  const cfg = await db.getHospitalSettings();

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Hospital, Inventory &amp; Security Settings</h2>
        <p>Configure hospital header, GSTIN, drug license, inventory alerts, SMS webhook, and auto-logout security.</p>
      </div>
      <div class="module-actions">
        <button type="button" class="btn btn-success" id="btn-seed-firestore">Seed Sample Hospital Data</button>
        ${db.getMode() === "sandbox" ? `<button type="button" class="btn btn-danger" id="btn-reset-sandbox">Reset Local Sandbox</button>` : ""}
      </div>
    </div>
    <form id="settings-form" class="card">
      <div class="form-grid">
        <div class="form-group"><label>Hospital / ERP Name</label><input name="hospitalName" value="${esc(cfg.hospitalName)}" required /></div>
        <div class="form-group"><label>Branch Name</label><input name="branchName" value="${esc(cfg.branchName)}" /></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${esc(cfg.phone)}" /></div>
        <div class="form-group"><label>Email</label><input name="email" value="${esc(cfg.email)}" /></div>
        <div class="form-group form-span-2"><label>Address</label><input name="address" value="${esc(cfg.address)}" /></div>
        <div class="form-group"><label>GSTIN</label><input name="gstin" value="${esc(cfg.gstin)}" /></div>
        <div class="form-group"><label>Drug License No</label><input name="drugLicenseNo" value="${esc(cfg.drugLicenseNo)}" /></div>
        <div class="form-group"><label>Default Pharmacy GST (%)</label><input name="defaultTaxSlab" type="number" value="${esc(cfg.defaultTaxSlab)}" /></div>
        <div class="form-group"><label>Low Stock Threshold (Qty)</label><input name="lowStockThreshold" type="number" value="${esc(cfg.lowStockThreshold)}" /></div>
        <div class="form-group"><label>Expiry Warning Days</label><input name="expiryWarningDays" type="number" value="${esc(cfg.expiryWarningDays)}" /></div>
        <div class="form-group"><label>Auto-Logout Inactivity (Minutes)</label><input name="autoLogoutMinutes" type="number" min="1" value="${esc(cfg.autoLogoutMinutes)}" /></div>
        <div class="form-group form-span-2"><label>SMS Gateway Webhook URL (optional)</label><input name="smsWebhookUrl" value="${esc(cfg.smsWebhookUrl || "")}" placeholder="https://your-sms-webhook.example/send" /></div>
        <div class="form-group form-span-2"><label>Receipt Footer Message</label><input name="receiptFooter" value="${esc(cfg.receiptFooter)}" /></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input type="checkbox" name="strictLogoutOnHide" ${cfg.strictLogoutOnHide ? "checked" : ""} style="width:auto;" />
            Strict Auto-Logout when leaving browser tab
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </div>
    </form>
  `;

  container.querySelector("#settings-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...cfg,
      hospitalName: fd.get("hospitalName"),
      branchName: fd.get("branchName"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      address: fd.get("address"),
      gstin: fd.get("gstin"),
      drugLicenseNo: fd.get("drugLicenseNo"),
      defaultTaxSlab: Number(fd.get("defaultTaxSlab")),
      lowStockThreshold: Number(fd.get("lowStockThreshold")),
      expiryWarningDays: Number(fd.get("expiryWarningDays")),
      autoLogoutMinutes: Number(fd.get("autoLogoutMinutes")),
      smsWebhookUrl: fd.get("smsWebhookUrl"),
      receiptFooter: fd.get("receiptFooter"),
      strictLogoutOnHide: fd.get("strictLogoutOnHide") === "on"
    };
    await db.saveHospitalSettings(updated);
    await auth.logAudit("UPDATE_SETTINGS", "Admin", "Updated hospital & inventory settings");
    toast("Settings saved successfully.", "success");
  };

  container.querySelector("#btn-seed-firestore").onclick = async () => {
    await db.seedFirestoreSampleData();
    toast("Sample hospital records seeded into database.", "success");
  };

  const resetBtn = container.querySelector("#btn-reset-sandbox");
  if (resetBtn) {
    resetBtn.onclick = async () => {
      await db.resetSandboxDemoData();
      toast("Sandbox data reset! Please sign in again.", "warn");
      await auth.signOut("Sandbox reset");
    };
  }
}

async function renderAuditTrail(container) {
  auth.requirePermission("view_financial_reports", "view security audit logs");
  const logs = await db.list("audit_logs");
  container.innerHTML = `
    <div class="module-header">
      <div><h2>Security &amp; Action Audit Trail</h2><p>Immutable log of logins, GRN approvals, billing voids, and settings changes.</p></div>
    </div>
    <div class="card"><div id="audit-table"></div></div>
  `;
  mountDataTable(container.querySelector("#audit-table"), {
    columns: [
      { key: "timestamp", label: "Timestamp", render: (r) => esc(new Date(r.timestamp).toLocaleString()) },
      { key: "user", label: "User" },
      { key: "role", label: "Role" },
      { key: "module", label: "Module" },
      { key: "action", label: "Action", render: (r) => `<span class="badge badge-blue">${esc(r.action)}</span>` },
      { key: "details", label: "Details" }
    ],
    rows: [...logs].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))),
    searchPlaceholder: "Search user, action, details...",
    exportFileName: "security-audit-log.csv",
    printTitle: "CuraTech Security Audit Trail"
  });
}

async function renderLeaveApprovals(container) {
  auth.requirePermission("admin", "approve employee leave requests");
  const leaves = await db.list("leave_requests");
  container.innerHTML = `
    <div class="module-header"><div><h2>Employee Leave Approvals</h2><p>Review and approve staff leave applications.</p></div></div>
    <div class="card"><div id="leave-app-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#leave-app-tbl"), {
    columns: [
      { key: "username", label: "Employee" },
      { key: "leaveType", label: "Type" },
      { key: "fromDate", label: "From" },
      { key: "toDate", label: "To" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "Approved" ? "badge-green" : r.status === "Rejected" ? "badge-red" : "badge-amber"}">${esc(r.status)}</span>` },
      {
        key: "act",
        label: "Action",
        noExport: true,
        render: (r) => r.status === "Pending"
          ? `<button class="btn btn-sm btn-success" data-id="${esc(r.id)}" data-st="Approved">Approve</button>
             <button class="btn btn-sm btn-danger" data-id="${esc(r.id)}" data-st="Rejected">Reject</button>`
          : "-"
      }
    ],
    rows: leaves
  });
  container.querySelector("#leave-app-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-st]");
    if (!btn) return;
    await db.update("leave_requests", btn.dataset.id, { status: btn.dataset.st, reviewedBy: auth.getCurrentUser().username });
    toast(`Leave ${btn.dataset.st.toLowerCase()}.`, "success");
    renderLeaveApprovals(container);
  };
}

async function renderSupportInbox(container) {
  auth.requirePermission("admin", "view Ask CuraTech support tickets");
  const tickets = await db.list("support_tickets");
  container.innerHTML = `
    <div class="module-header"><div><h2>Ask CuraTech — Internal Support Tickets</h2><p>Staff technical queries and issue logs.</p></div></div>
    <div class="card"><div id="tickets-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#tickets-tbl"), {
    columns: [
      { key: "createdAt", label: "Date", render: (t) => esc(String(t.createdAt).slice(0, 10)) },
      { key: "submittedBy", label: "User" },
      { key: "subject", label: "Subject" },
      { key: "message", label: "Description" },
      { key: "status", label: "Status", render: (t) => `<span class="badge ${t.status === "Resolved" ? "badge-green" : "badge-amber"}">${esc(t.status)}</span>` },
      {
        key: "act",
        label: "Resolve",
        noExport: true,
        render: (t) => t.status !== "Resolved" ? `<button class="btn btn-sm btn-success" data-resolve="${esc(t.id)}">Mark Resolved</button>` : "Done"
      }
    ],
    rows: tickets
  });
  container.querySelector("#tickets-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-resolve]");
    if (!btn) return;
    await db.update("support_tickets", btn.dataset.resolve, { status: "Resolved" });
    toast("Support ticket marked resolved.", "success");
    renderSupportInbox(container);
  };
}
