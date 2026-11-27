/**
 * Admin Module: User Management, RBAC Permissions Matrix, GRN Approvals,
 * System & Inventory Settings, Security Audit Trail, Leave Approvals & Support Tickets.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../seed-data.js";
import { esc, money, mountDataTable, openModal, closeModal, toast } from "../ui.js";

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
    exportFileName: "guruhospital-users.csv"
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
    title: "Create New Hospital / Pharmacy User",
    width: "680px",
    bodyHtml: `
      <form id="create-user-form">
        <div class="form-grid">
          <div class="form-group"><label>Username *</label><input name="username" required placeholder="e.g. nurse_priya" /></div>
          <div class="form-group"><label>Full Name *</label><input name="fullName" required placeholder="e.g. Priya S" /></div>
          <div class="form-group"><label>Email (optional)</label><input name="email" type="email" placeholder="Auto: username@guruhospital.in" /></div>
          <div class="form-group"><label>Password (min 6 chars) *</label><input name="password" type="password" minlength="6" required /></div>
          <div class="form-group">
            <label>Role *</label>
            <select name="role" id="cu-role">
              <option value="staff">Staff (Restricted)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>
          <div class="form-group"><label>Department</label><input name="department" value="Front Office &amp; Pharmacy" /></div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Granular Permissions</label>
          <div id="cu-perms-slot">${buildPermissionCheckboxesHtml(DEFAULT_ROLE_PERMISSIONS.staff)}</div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Create User Account</button>
        </div>
      </form>
    `,
    onMount: (slot) => {
      slot.querySelector("#cu-role").onchange = (e) => {
        const preset = DEFAULT_ROLE_PERMISSIONS[e.target.value] || DEFAULT_ROLE_PERMISSIONS.staff;
        slot.querySelector("#cu-perms-slot").innerHTML = buildPermissionCheckboxesHtml(preset);
      };

      slot.querySelector("#create-user-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const permissions = { app_home: true, nalam: true };
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
    width: "680px",
    bodyHtml: `
      <form id="edit-perms-form">
        <div class="form-grid">
          <div class="form-group"><label>Full Name</label><input name="fullName" value="${esc(user.fullName)}" required /></div>
          <div class="form-group"><label>Department</label><input name="department" value="${esc(user.department || "")}" /></div>
          <div class="form-group">
            <label>Assigned Role</label>
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
        const permissions = { app_home: true, nalam: true };
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
          In <strong>Local Sandbox</strong>, this sets a new password immediately. In <strong>Firebase</strong>, users with email addresses receive a reset link, or you can reset virtual usernames in Firebase Console.
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
      { key: "netTotal", label: "Net Amount", render: (g) => money(g.netTotal) },
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
          ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">
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
    if (!grn || grn.status !== "Pending Approval") return;

    const approver = auth.getCurrentUser().username;
    if (act === "reject") {
      await db.update(col, id, { status: "Rejected", approvedBy: approver });
      await auth.logAudit("REJECT_GRN", "Admin", `Rejected GRN ${id}`);
      toast(`GRN ${id} rejected.`, "warn");
      return renderGrnApprovals(container);
    }

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
          await db.update("store_items", existing.id, {
            stock: Number(existing.stock || 0) + Number(item.qty || 0)
          });
        } else {
          await db.add("store_items", {
            name: item.itemName,
            category: "General",
            unit: item.unit || "Unit",
            stock: Number(item.qty || 0),
            minLevel: 5
          });
        }
      }
    }

    await db.update(col, id, { status: "Approved", approvedBy: approver, approvedAt: new Date().toISOString() });
    await auth.logAudit("APPROVE_GRN", "Admin", `Approved GRN ${id} (${grn.dept})`);
    toast(`GRN ${id} approved and live inventory updated!`, "success");
    renderGrnApprovals(container);
  };
}

async function renderSystemSettings(container) {
  auth.requirePermission("manage_inventory_settings", "manage hospital & inventory settings");
  const cfg = await db.getHospitalSettings();

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>System, Security &amp; Inventory Settings (Admin Only)</h2>
        <p>Configure Guru Hospital profile, auto-logout timers, pharmacy reorder thresholds, and SMS webhooks.</p>
      </div>
    </div>
    <div class="card">
      <form id="settings-form" class="form-grid">
        <div class="form-group"><label>Hospital / System Title</label><input name="hospitalName" value="${esc(cfg.hospitalName)}" required /></div>
        <div class="form-group"><label>UHID Prefix</label><input name="uhidPrefix" value="${esc(cfg.uhidPrefix || "GH")}" required /></div>
        <div class="form-group form-span-2"><label>Hospital Address</label><input name="address" value="${esc(cfg.address)}" /></div>
        <div class="form-group"><label>Contact Phone</label><input name="phone" value="${esc(cfg.phone)}" /></div>
        <div class="form-group"><label>GSTIN</label><input name="gstin" value="${esc(cfg.gstin)}" /></div>
        <div class="form-group"><label>Drug License No</label><input name="drugLicenseNo" value="${esc(cfg.drugLicenseNo)}" /></div>
        <div class="form-group"><label>Low Stock Alert Threshold (Units)</label><input name="lowStockThreshold" type="number" min="1" value="${esc(cfg.lowStockThreshold || 15)}" /></div>
        <div class="form-group"><label>Near Expiry Alert Window (Days)</label><input name="nearExpiryDays" type="number" min="15" value="${esc(cfg.nearExpiryDays || 90)}" /></div>
        <div class="form-group"><label>Idle Auto-Logout (Minutes)</label><input name="autoLogoutMinutes" type="number" min="1" max="120" value="${esc(cfg.autoLogoutMinutes || 15)}" /></div>
        <div class="form-group">
          <label>Auto-Logout When Switching/Minimizing App</label>
          <select name="strictLogoutOnHide">
            <option value="false" ${!cfg.strictLogoutOnHide ? "selected" : ""}>On Browser Close / Exit + Inactivity Timer (Recommended)</option>
            <option value="true" ${cfg.strictLogoutOnHide ? "selected" : ""}>Strict: Immediate Logout When Switching Tab/App</option>
          </select>
        </div>
        <div class="form-group"><label>SMS Gateway Webhook URL (Optional)</label><input name="smsWebhookUrl" value="${esc(cfg.smsWebhookUrl || "")}" placeholder="https://..." /></div>
        <div class="form-group form-span-2"><label>Thermal Receipt Footer</label><input name="receiptFooter" value="${esc(cfg.receiptFooter || "")}" /></div>
        <div class="form-actions form-span-2">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <button type="button" class="btn btn-success" id="btn-seed-cloud">Seed Sample Hospital Data</button>
          <button type="button" class="btn btn-warning" id="btn-reset-sandbox">Reset Local Sandbox Data</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector("#settings-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...cfg,
      hospitalName: fd.get("hospitalName"),
      uhidPrefix: fd.get("uhidPrefix"),
      address: fd.get("address"),
      phone: fd.get("phone"),
      gstin: fd.get("gstin"),
      drugLicenseNo: fd.get("drugLicenseNo"),
      lowStockThreshold: Number(fd.get("lowStockThreshold")),
      nearExpiryDays: Number(fd.get("nearExpiryDays")),
      autoLogoutMinutes: Number(fd.get("autoLogoutMinutes")),
      strictLogoutOnHide: fd.get("strictLogoutOnHide") === "true",
      smsWebhookUrl: fd.get("smsWebhookUrl"),
      receiptFooter: fd.get("receiptFooter")
    };
    await db.saveHospitalSettings(updated);
    await auth.logAudit("UPDATE_SETTINGS", "Admin", "Updated hospital & inventory settings");
    toast("Settings saved. Auto-logout & branding rules updated!", "success");
  };

  container.querySelector("#btn-seed-cloud").onclick = async () => {
    await db.seedFirestoreSampleData();
    toast("Sample patients, medicines, beds, and tests populated!", "success");
  };

  container.querySelector("#btn-reset-sandbox").onclick = async () => {
    await db.resetSandboxDemoData();
    toast("Local sandbox reset to initial state.", "warn");
  };
}

async function renderAuditTrail(container) {
  auth.requirePermission("view_financial_reports", "view security audit trail");
  const logs = await db.list("audit_logs");
  container.innerHTML = `
    <div class="module-header">
      <div><h2>Security &amp; Financial Audit Trail</h2><p>Immutable log of logins, GRN approvals, bill voids, and setting updates.</p></div>
    </div>
    <div class="card"><div id="audit-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#audit-tbl"), {
    columns: [
      { key: "timestamp", label: "Time", render: (r) => esc(String(r.timestamp || "").replace("T", " ").slice(0, 19)) },
      { key: "user", label: "User" },
      { key: "role", label: "Role" },
      { key: "module", label: "Module" },
      { key: "action", label: "Action" },
      { key: "details", label: "Details" }
    ],
    rows: logs,
    exportFileName: "security-audit-log.csv",
    printTitle: "Security Audit Trail"
  });
}

async function renderLeaveApprovals(container) {
  auth.requirePermission("admin", "approve employee leave requests");
  const leaves = await db.list("leave_requests");
  container.innerHTML = `
    <div class="module-header"><div><h2>Employee Leave Approvals</h2><p>Review and approve staff leave requests.</p></div></div>
    <div class="card"><div id="leave-admin-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#leave-admin-tbl"), {
    columns: [
      { key: "employee", label: "Staff" },
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
          ? `<button class="btn btn-sm btn-success" data-lv="Approved" data-id="${esc(r.id)}">Approve</button>
             <button class="btn btn-sm btn-danger" data-lv="Rejected" data-id="${esc(r.id)}">Reject</button>`
          : esc(r.reviewedBy || "-")
      }
    ],
    rows: leaves
  });
  container.querySelector("#leave-admin-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-lv]");
    if (!btn) return;
    await db.update("leave_requests", btn.dataset.id, { status: btn.dataset.lv, reviewedBy: auth.getCurrentUser().username });
    toast(`Leave ${btn.dataset.lv}`, "success");
    renderLeaveApprovals(container);
  };
}

async function renderSupportInbox(container) {
  auth.requirePermission("admin", "view Ask Nalam helpdesk tickets");
  const tickets = await db.list("support_tickets");
  container.innerHTML = `
    <div class="module-header"><div><h2>Ask Nalam Internal Helpdesk Inbox</h2></div></div>
    <div class="card"><div id="tickets-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#tickets-tbl"), {
    columns: [
      { key: "createdAt", label: "Date", render: (r) => esc(String(r.createdAt || "").slice(0, 10)) },
      { key: "submittedBy", label: "Staff" },
      { key: "subject", label: "Subject" },
      { key: "message", label: "Query" },
      { key: "status", label: "Status" },
      {
        key: "act",
        label: "Resolve",
        noExport: true,
        render: (r) => r.status !== "Resolved" ? `<button class="btn btn-sm btn-success" data-res="${esc(r.id)}">Mark Resolved</button>` : "Done"
      }
    ],
    rows: tickets
  });
  container.querySelector("#tickets-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-res]");
    if (!btn) return;
    await db.update("support_tickets", btn.dataset.res, { status: "Resolved" });
    toast("Support ticket resolved.", "success");
    renderSupportInbox(container);
  };
}
