/**
 * Facility Hub, See Curavite User/HR/About, Certificates, Equipments,
 * Physiotherapy, General Store, Ambulance Fleet & Skin Aesthetics Modules.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { printA4Document } from "../print.js";
import { esc, money, todayISO, mountDataTable, toast } from "../ui.js";

export async function renderOperationsView(viewId, container, params = {}, openViewFn = null) {
  switch (viewId) {
    case "exec_dashboard":
      return renderExecutiveDashboard(container, openViewFn);
    case "equip_registry":
    case "equip_calibration":
    case "equip_service":
    case "service_report":
      return renderEquipments(container, viewId);
    case "daily_worksheet":
    case "worksheet_report":
      return renderWorksheet(container, viewId === "worksheet_report");
    case "gate_pass_mgmt":
    case "gate_pass_report":
      return renderGatePass(container, viewId === "gate_pass_report");
    case "document_upload":
    case "documents_report":
      return renderDocumentArchive(container, viewId === "documents_report");
    case "change_password":
      return renderChangePassword(container);
    case "employee_leave":
      return renderLeaveRequest(container);
    case "about_curavite":
      return renderAboutSystem(container);
    case "ask_curavite":
      return renderAskSupport(container);
    case "cert_issue":
    case "cert_register":
      return renderCertificateModule(container, params.certType || "Medical Certificate", viewId === "cert_register");
    case "physio_sessions":
    case "physio_scoring":
    case "physio_report":
      return renderPhysiotherapy(container, viewId);
    case "store_inventory":
    case "store_purchase":
    case "store_issue":
    case "store_report":
      return renderStoreModule(container, viewId);
    case "amb_fleet":
    case "amb_dispatch":
    case "amb_billing":
    case "amb_report":
      return renderAmbulanceModule(container, viewId);
    case "skin_consult":
    case "skin_packages":
    case "skin_report":
      return renderSkinModule(container, viewId);
    default:
      return renderExecutiveDashboard(container, openViewFn);
  }
}

async function renderExecutiveDashboard(container, openViewFn) {
  const [patients, visits, ips, beds, meds, bills, pharma, pendingGrns] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("ip_admissions"),
    db.list("beds"),
    db.list("medicines"),
    db.list("cashier_bills"),
    db.list("pharmacy_sales"),
    db.list("pharmacy_purchases")
  ]);
  const settings = await db.getHospitalSettings();
  const today = todayISO();
  const todayBills = bills.filter((b) => b.billDate === today && b.status === "Paid").reduce((s, b) => s + Number(b.netAmount || 0), 0);
  const todayPharma = pharma.filter((p) => p.billDate === today && p.status === "Paid").reduce((s, p) => s + Number(p.netTotal || 0), 0);
  const occupiedBeds = beds.filter((b) => b.status === "Occupied").length;
  const lowMeds = meds.filter((m) => Number(m.stock) <= Number(settings.lowStockThreshold || 15));
  const waitingGrns = pendingGrns.filter((g) => g.status === "Pending Approval");

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Executive Facility &amp; Operations Dashboard — See Curavite Hospital Management</h2>
        <p>Live clinical queue, bed occupancy, pharmacy alerts, and revenue overview (${today}).</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" data-jump="patient_new|New Patient">+ New Patient</button>
        <button class="btn btn-success" data-jump="pharma_general_pos|Pharmacy Counter POS">Pharmacy POS</button>
        <button class="btn" data-jump="cashier_dashboard|Cashier Billing">Cashier Desk</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Registered Patients</div><div class="kpi-value">${patients.length}</div><div class="kpi-sub">${visits.length} OP Visits logged</div></div>
      <div class="kpi-card green"><div class="kpi-label">Today's Hospital + Pharmacy</div><div class="kpi-value">${auth.hasPermission("view_financial_reports") ? money(todayBills + todayPharma) : "Staff View"}</div><div class="kpi-sub">${bills.filter((b) => b.status === "Pending").length} pending bills</div></div>
      <div class="kpi-card amber"><div class="kpi-label">IP Bed Occupancy</div><div class="kpi-value">${occupiedBeds} / ${beds.length}</div><div class="kpi-sub">${ips.filter((i) => i.status === "Admitted").length} Active Inpatients</div></div>
      <div class="kpi-card red"><div class="kpi-label">Stock &amp; GRN Alerts</div><div class="kpi-value">${lowMeds.length} Low | ${waitingGrns.length} GRN</div><div class="kpi-sub">Threshold &le; ${settings.lowStockThreshold || 15} units</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Low Stock Pharmacy Medicines</h3>
        <div id="dash-low-meds"></div>
      </div>
      <div class="card">
        <h3 class="card-title">Pending Approvals &amp; Active OP Queue</h3>
        <div class="alert alert-info">
          <strong>Role Active:</strong> ${esc(auth.getCurrentUser().role.toUpperCase())} (${esc(auth.getCurrentUser().username)}).
          ${auth.isAdmin() ? "You have full Administrator access including GRN Approvals, User Management, Inventory Settings, and Financial Reports." : "Staff mode active: Billing, Reception, Lab & Pharmacy Sales enabled. GRN approvals & system settings are Admin-locked."}
        </div>
        <div id="dash-op-queue"></div>
      </div>
    </div>
  `;

  container.querySelectorAll("button[data-jump]").forEach((btn) => {
    btn.onclick = () => {
      const [vid, title] = btn.dataset.jump.split("|");
      if (openViewFn) openViewFn(vid, title, {});
    };
  });

  mountDataTable(container.querySelector("#dash-low-meds"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "batchNo", label: "Batch" },
      { key: "stock", label: "Stock", render: (m) => `<span class="badge badge-red">${m.stock}</span>` },
      { key: "expiry", label: "Expiry" }
    ],
    rows: lowMeds,
    emptyText: "All medicines above low-stock threshold."
  });

  mountDataTable(container.querySelector("#dash-op-queue"), {
    columns: [
      { key: "tokenNo", label: "Token" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "status", label: "Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : "badge-amber"}">${esc(v.status)}</span>` }
    ],
    rows: visits.slice(0, 8)
  });
}

async function renderEquipments(container, viewId) {
  const [equips, logs] = await Promise.all([db.list("equipments"), db.list("equipment_service_logs")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Biomedical Equipment Lifecycle &amp; Service (${esc(viewId.replace("equip_", "").toUpperCase())})</h2></div></div>
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Register Biomedical Asset</h3>
        <form id="eq-add-form" class="form-grid">
          <div class="form-group"><label>Equipment Name *</label><input name="name" required /></div>
          <div class="form-group"><label>Department</label><input name="dept" value="ICU" /></div>
          <div class="form-group"><label>Serial No</label><input name="serialNo" required /></div>
          <div class="form-group"><label>AMC Due Date</label><input name="amcDue" type="date" value="2027-06-30" /></div>
          <div class="form-group"><label>Calibration Due</label><input name="calibrationDue" type="date" value="2027-03-31" /></div>
          <div class="form-actions"><button type="submit" class="btn btn-primary">+ Add Equipment</button></div>
        </form>
      </div>
      <div class="card">
        <h3 class="card-title">Log Calibration / Breakdown Service</h3>
        <form id="eq-srv-form" class="form-grid">
          <div class="form-group"><label>Equipment</label><select name="equipName">${equips.map((e) => `<option>${esc(e.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Service Type</label><select name="serviceType"><option>Calibration</option><option>Preventive AMC</option><option>Breakdown Repair</option></select></div>
          <div class="form-group"><label>Engineer / Vendor</label><input name="vendor" required /></div>
          <div class="form-group"><label>Notes</label><input name="notes" required /></div>
          <div class="form-actions"><button type="submit" class="btn btn-success">Log Service Record</button></div>
        </form>
      </div>
    </div>
    <div class="card"><h3 class="card-title">Asset Registry</h3><div id="eq-tbl"></div></div>
    <div class="card"><h3 class="card-title">Service &amp; Calibration Audit Report</h3><div id="eq-srv-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#eq-tbl"), {
    columns: [{ key: "name", label: "Equipment" }, { key: "dept", label: "Dept" }, { key: "serialNo", label: "Serial" }, { key: "amcDue", label: "AMC Due" }, { key: "calibrationDue", label: "Calibration" }, { key: "status", label: "Status" }],
    rows: equips,
    exportFileName: "equipments-registry.csv"
  });
  mountDataTable(container.querySelector("#eq-srv-tbl"), {
    columns: [{ key: "serviceDate", label: "Date" }, { key: "equipName", label: "Equipment" }, { key: "serviceType", label: "Type" }, { key: "vendor", label: "Vendor" }, { key: "notes", label: "Notes" }],
    rows: logs,
    printTitle: "Equipment Service & Calibration Report"
  });

  container.querySelector("#eq-add-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("equipments", { name: fd.get("name"), dept: fd.get("dept"), serialNo: fd.get("serialNo"), amcDue: fd.get("amcDue"), calibrationDue: fd.get("calibrationDue"), status: "Operational" });
    toast("Biomedical equipment registered.", "success");
    renderEquipments(container, viewId);
  };
  container.querySelector("#eq-srv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("equipment_service_logs", { serviceDate: todayISO(), equipName: fd.get("equipName"), serviceType: fd.get("serviceType"), vendor: fd.get("vendor"), notes: fd.get("notes") });
    toast("Service record saved.", "success");
    renderEquipments(container, viewId);
  };
}

async function renderWorksheet(container, reportOnly) {
  const rows = await db.list("daily_worksheets");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Daily Worksheet Compliance Report" : "Daily Staff Worksheet Log"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="ws-form" class="form-grid">
        <div class="form-group"><label>Department / Area</label><input name="area" value="OPD / Ward Cleaning" required /></div>
        <div class="form-group"><label>Task Completed *</label><input name="task" required placeholder="e.g. Autoclave cycle & OT sanitization" /></div>
        <div class="form-group"><label>Status</label><select name="status"><option>Completed</option><option>In Progress</option></select></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Save Worksheet Entry</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="ws-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ws-tbl"), {
    columns: [{ key: "logDate", label: "Date" }, { key: "staff", label: "Staff" }, { key: "area", label: "Area" }, { key: "task", label: "Task" }, { key: "status", label: "Status" }],
    rows,
    exportFileName: "worksheet-report.csv",
    printTitle: "Daily Worksheet Report"
  });
  if (!reportOnly) {
    container.querySelector("#ws-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("daily_worksheets", { logDate: todayISO(), staff: auth.getCurrentUser().username, area: fd.get("area"), task: fd.get("task"), status: fd.get("status") });
      toast("Worksheet entry saved.", "success");
      renderWorksheet(container, false);
    };
  }
}

async function renderGatePass(container, reportOnly) {
  const passes = await db.list("gate_passes");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Gate Pass Audit Report" : "Gate Pass Management"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="gp-form" class="form-grid">
        <div class="form-group"><label>Pass Type</label><select name="passType"><option>Visitor Pass</option><option>Patient Attender</option><option>Material Outward</option><option>Returnable Asset</option></select></div>
        <div class="form-group"><label>Person / Vendor Name *</label><input name="personName" required /></div>
        <div class="form-group"><label>Mobile / ID</label><input name="contact" required /></div>
        <div class="form-group"><label>Purpose / Items</label><input name="purpose" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Issue Gate Pass</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="gp-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#gp-tbl"), {
    columns: [
      { key: "id", label: "Pass No" },
      { key: "passDate", label: "Date" },
      { key: "passType", label: "Type" },
      { key: "personName", label: "Person" },
      { key: "purpose", label: "Purpose" },
      { key: "status", label: "Status" },
      { key: "act", label: "Exit", noExport: true, render: (r) => r.status === "Active" ? `<button class="btn btn-sm" data-close="${esc(r.id)}">Mark Exit</button>` : "Closed" }
    ],
    rows: passes,
    exportFileName: "gate-pass-report.csv",
    printTitle: "Gate Pass Register"
  });
  if (!reportOnly) {
    container.querySelector("#gp-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = await db.nextSequence("GP");
      await db.add("gate_passes", { id, passDate: todayISO(), passType: fd.get("passType"), personName: fd.get("personName"), contact: fd.get("contact"), purpose: fd.get("purpose"), status: "Active", issuedBy: auth.getCurrentUser().username });
      toast(`Gate Pass ${id} issued.`, "success");
      renderGatePass(container, false);
    };
  }
  container.querySelector("#gp-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-close]");
    if (!btn) return;
    await db.update("gate_passes", btn.dataset.close, { status: "Exited" });
    toast("Gate pass closed.", "success");
    renderGatePass(container, reportOnly);
  };
}

async function renderDocumentArchive(container, reportOnly) {
  const docs = await db.list("hospital_documents");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Hospital Documents Archive Report" : "Centralized Document Upload &amp; Archiving"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="doc-up-form" class="form-grid">
        <div class="form-group"><label>Document Title *</label><input name="title" required placeholder="e.g. Fire NOC 2026 / Patient Consent" /></div>
        <div class="form-group"><label>Category</label><select name="category"><option>Statutory License</option><option>Patient Consent</option><option>Vendor Invoice</option><option>SOP Manual</option></select></div>
        <div class="form-group"><label>Attach File (PDF/Image, max 400KB)</label><input name="file" type="file" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Archive Document</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="doc-arch-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#doc-arch-tbl"), {
    columns: [
      { key: "id", label: "Doc ID" },
      { key: "uploadDate", label: "Date" },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "fileName", label: "File" },
      { key: "uploadedBy", label: "Uploaded By" },
      { key: "dl", label: "Open", noExport: true, render: (r) => r.dataUrl ? `<a class="btn btn-sm" href="${r.dataUrl}" download="${esc(r.fileName || "doc")}">Download</a>` : "Metadata" }
    ],
    rows: docs,
    exportFileName: "documents-report.csv"
  });
  if (!reportOnly) {
    container.querySelector("#doc-up-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const file = fd.get("file");
      let dataUrl = "";
      let fileName = "metadata-only";
      if (file && file.size > 0) {
        if (file.size > 450 * 1024) return toast("File exceeds 450KB limit for free database storage.", "error");
        fileName = file.name;
        dataUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(file);
        });
      }
      const id = await db.nextSequence("DOC");
      await db.add("hospital_documents", { id, uploadDate: todayISO(), title: fd.get("title"), category: fd.get("category"), fileName, dataUrl, uploadedBy: auth.getCurrentUser().username });
      toast(`Document ${id} archived.`, "success");
      renderDocumentArchive(container, false);
    };
  }
}

async function renderChangePassword(container) {
  container.innerHTML = `
    <div class="module-header"><div><h2>Change My Account Password</h2></div></div>
    <div class="card" style="max-width:460px;">
      <form id="chg-pw-form">
        <div class="form-group"><label>Current Password *</label><input name="currentPw" type="password" required /></div>
        <div class="form-group" style="margin-top:10px;"><label>New Password (min 6 chars) *</label><input name="newPw" type="password" minlength="6" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Update Password</button></div>
      </form>
    </div>
  `;
  container.querySelector("#chg-pw-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await auth.changeOwnPassword(fd.get("currentPw"), fd.get("newPw"));
      toast("Password updated successfully.", "success");
      e.target.reset();
    } catch (err) {
      toast(err.message, "error");
    }
  };
}

async function renderLeaveRequest(container) {
  const leaves = (await db.list("leave_requests")).filter((l) => l.employee === auth.getCurrentUser().username || auth.isAdmin());
  container.innerHTML = `
    <div class="module-header"><div><h2>Employee Leave Request &amp; Tracking</h2></div></div>
    <div class="card">
      <form id="lv-form" class="form-grid">
        <div class="form-group"><label>Leave Type</label><select name="leaveType"><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option></select></div>
        <div class="form-group"><label>From Date</label><input name="fromDate" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>To Date</label><input name="toDate" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Reason</label><input name="reason" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Submit Leave Application</button></div>
      </form>
    </div>
    <div class="card"><div id="lv-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lv-tbl"), {
    columns: [{ key: "employee", label: "Staff" }, { key: "leaveType", label: "Type" }, { key: "fromDate", label: "From" }, { key: "toDate", label: "To" }, { key: "reason", label: "Reason" }, { key: "status", label: "Status" }],
    rows: leaves
  });
  container.querySelector("#lv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("leave_requests", { employee: auth.getCurrentUser().username, leaveType: fd.get("leaveType"), fromDate: fd.get("fromDate"), toDate: fd.get("toDate"), reason: fd.get("reason"), status: "Pending" });
    toast("Leave request submitted.", "success");
    renderLeaveRequest(container);
  };
}

async function renderAboutSystem(container) {
  const cfg = await db.getHospitalSettings();
  container.innerHTML = `
    <div class="module-header"><div><h2>About See Curavite Hospital Management</h2></div></div>
    <div class="card">
      <p><strong>Hospital:</strong> ${esc(cfg.hospitalName)}</p>
      <p><strong>Platform Edition:</strong> See Curavite Web Enterprise v2.2 (Vibrant Responsive HTML5 + CSS3 + ES6 JavaScript + Firebase Free Tier + Vercel Ready)</p>
      <p><strong>Modules Active:</strong> All 17 Departmental Hubs via Collapsible Side Hamburger Navigation (Facility Hub, See Curavite, Patient, Doctor, Lab, Pharmacy, Cashier, Maintenance, Accounts, Reports, Certificate, Equipments, Admin, Physiotherapy, Store, Ambulance, Skin)</p>
      <p><strong>Security Model:</strong> Session-only authentication (auto-logout on exit &amp; inactivity timer), Granular Admin/Staff RBAC, and Cloud Firestore Security Rules.</p>
    </div>
  `;
}

async function renderAskSupport(container) {
  container.innerHTML = `
    <div class="module-header"><div><h2>Ask Curavite — Internal Technical Helpdesk</h2></div></div>
    <div class="card" style="max-width:620px;">
      <form id="ask-form" class="form-grid">
        <div class="form-group form-span-2"><label>Subject *</label><input name="subject" required placeholder="e.g. Printer config / New medicine GST slab" /></div>
        <div class="form-group form-span-2"><label>Question / Issue *</label><textarea name="message" rows="3" required></textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-success">Send Support Request</button></div>
      </form>
    </div>
  `;
  container.querySelector("#ask-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("support_tickets", { submittedBy: auth.getCurrentUser().username, subject: fd.get("subject"), message: fd.get("message"), status: "Open" });
    toast("Support request submitted to Admin Helpdesk.", "success");
    e.target.reset();
  };
}

async function renderCertificateModule(container, certType, registerOnly) {
  const [patients, certs] = await Promise.all([db.list("patients"), db.list("certificates")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>${registerOnly ? "Statutory &amp; Medical Certificate Register" : `Issue ${esc(certType)}`}</h2></div></div>
    ${!registerOnly ? `
    <div class="card">
      <form id="cert-form" class="form-grid">
        <div class="form-group"><label>Certificate Type</label><select name="certType"><option ${certType === "Medical Certificate" ? "selected" : ""}>Medical Certificate</option><option ${certType === "Fitness Certificate" ? "selected" : ""}>Fitness Certificate</option><option ${certType === "Birth Certificate" ? "selected" : ""}>Birth Certificate</option><option ${certType === "Death Certificate" ? "selected" : ""}>Death Certificate</option></select></div>
        <div class="form-group"><label>Patient *</label><select name="patient">${patients.map((p) => `<option value="${esc(p.uhid)}|${esc(p.fullName)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Doctor Name</label><input name="doctor" value="Dr. S. Karthikeyan (MD)" required /></div>
        <div class="form-group form-span-2"><label>Clinical Statement / Particulars *</label><textarea name="details" rows="2" required placeholder="e.g. Advised 5 days medical rest / Certified medically fit for duty"></textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Issue &amp; Print A4 Certificate</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="cert-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#cert-tbl"), {
    columns: [
      { key: "id", label: "Cert No" },
      { key: "issueDate", label: "Date" },
      { key: "certType", label: "Type" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "pr", label: "Print", noExport: true, render: (r) => `<button class="btn btn-sm" data-cprint="${esc(r.id)}">Print A4</button>` }
    ],
    rows: certs
  });
  if (!registerOnly) {
    container.querySelector("#cert-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const [uhid, patientName] = String(fd.get("patient")).split("|");
      const id = await db.nextSequence("CERT");
      const rec = { id, issueDate: todayISO(), certType: fd.get("certType"), uhid, patientName, doctor: fd.get("doctor"), details: fd.get("details") };
      await db.add("certificates", rec);
      toast(`Certificate ${id} issued.`, "success");
      await printA4Document({
        docTitle: rec.certType,
        metaPairs: [["Certificate No", id], ["Issue Date", rec.issueDate], ["UHID", uhid], ["Patient Name", patientName]],
        bodyHtml: `<p style="font-size:14px;line-height:1.7;">${esc(rec.details)}</p><p><strong>Certifying Physician:</strong> ${esc(rec.doctor)}</p>`,
        signatureLabel: rec.doctor
      });
      renderCertificateModule(container, certType, false);
    };
  }
  container.querySelector("#cert-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-cprint]");
    if (!btn) return;
    const rec = certs.find((c) => c.id === btn.dataset.cprint);
    if (rec) {
      await printA4Document({
        docTitle: rec.certType,
        metaPairs: [["Certificate No", rec.id], ["Issue Date", rec.issueDate], ["UHID", rec.uhid], ["Patient Name", rec.patientName]],
        bodyHtml: `<p style="font-size:14px;line-height:1.7;">${esc(rec.details)}</p>`,
        signatureLabel: rec.doctor
      });
    }
  };
}

async function renderPhysiotherapy(container, viewId) {
  const [patients, sessions] = await Promise.all([db.list("patients"), db.list("physio_sessions")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Physiotherapy &amp; Rehab (${esc(viewId.replace("physio_", "").toUpperCase())})</h2></div></div>
    <div class="card">
      <form id="pt-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="patient">${patients.map((p) => `<option value="${esc(p.uhid)}|${esc(p.fullName)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Modality / Therapy</label><select name="modality"><option>IFT &amp; Ultrasound</option><option>Ortho Mobilization</option><option>Stroke Neuro Rehab</option><option>Chest Physiotherapy</option></select></div>
        <div class="form-group"><label>Outcome Pain Score (0-10)</label><input name="score" type="number" min="0" max="10" value="4" /></div>
        <div class="form-group"><label>Fee (₹)</label><input name="fee" type="number" value="450" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Record Therapy Session</button></div>
      </form>
    </div>
    <div class="card"><div id="pt-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pt-tbl"), {
    columns: [{ key: "sessionDate", label: "Date" }, { key: "uhid", label: "UHID" }, { key: "patientName", label: "Patient" }, { key: "modality", label: "Therapy" }, { key: "score", label: "Outcome Score" }, { key: "fee", label: "Fee", render: (r) => money(r.fee) }],
    rows: sessions,
    printTitle: "Physiotherapy Sessions Report"
  });
  container.querySelector("#pt-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const [uhid, patientName] = String(fd.get("patient")).split("|");
    await db.add("physio_sessions", { sessionDate: todayISO(), uhid, patientName, modality: fd.get("modality"), score: Number(fd.get("score")), fee: Number(fd.get("fee")) });
    toast("Physiotherapy session recorded.", "success");
    renderPhysiotherapy(container, viewId);
  };
}

async function renderStoreModule(container, viewId) {
  const [items, issues, purchases] = await Promise.all([db.list("store_items"), db.list("store_issues"), db.list("store_purchases")]);
  const isAdmin = auth.hasPermission("approve_grn");

  container.innerHTML = `
    <div class="module-header"><div><h2>Central Non-Medical General Store (${esc(viewId.replace("store_", "").toUpperCase())})</h2></div></div>
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Store GRN / Purchase Entry</h3>
        <form id="st-grn-form" class="form-grid">
          <div class="form-group"><label>Supplier Invoice *</label><input name="invoiceNo" required /></div>
          <div class="form-group"><label>Supplier</label><input name="supplier" value="Hospital Supply Co" required /></div>
          <div class="form-group"><label>Item Name *</label><input name="itemName" required placeholder="e.g. Surgical Gloves" /></div>
          <div class="form-group"><label>Qty *</label><input name="qty" type="number" min="1" value="10" required /></div>
          <div class="form-group"><label>Total Amount (₹)</label><input name="netTotal" type="number" value="2500" required /></div>
          <div class="form-actions"><button type="submit" class="btn btn-primary">${isAdmin ? "Save &amp; Approve GRN" : "Submit GRN for Admin Approval"}</button></div>
        </form>
      </div>
      <div class="card">
        <h3 class="card-title">Issue Consumables to Department</h3>
        <form id="st-iss-form" class="form-grid">
          <div class="form-group"><label>Store Item</label><select name="itemId">${items.map((i) => `<option value="${esc(i.id)}">${esc(i.name)} (Avail: ${i.stock})</option>`).join("")}</select></div>
          <div class="form-group"><label>Department</label><select name="dept"><option>ICU</option><option>OT</option><option>Lab</option><option>Front Office</option></select></div>
          <div class="form-group"><label>Qty</label><input name="qty" type="number" min="1" value="1" required /></div>
          <div class="form-actions"><button type="submit" class="btn btn-warning">Issue Stock</button></div>
        </form>
      </div>
    </div>
    <div class="card"><h3 class="card-title">General Store Inventory</h3><div id="st-inv-tbl"></div></div>
    <div class="card"><h3 class="card-title">Store Purchase &amp; Issue Log</h3><div id="st-grn-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#st-inv-tbl"), {
    columns: [{ key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" }, { key: "stock", label: "Stock" }],
    rows: items,
    exportFileName: "store-inventory.csv"
  });
  mountDataTable(container.querySelector("#st-grn-tbl"), {
    columns: [{ key: "id", label: "Ref" }, { key: "grnDate", label: "Date" }, { key: "supplier", label: "Supplier / Dept" }, { key: "status", label: "Status" }],
    rows: [...purchases, ...issues.map((i) => ({ id: i.id, grnDate: i.issueDate, supplier: `${i.dept} (${i.itemName} × ${i.qty})`, status: "Issued" }))]
  });

  container.querySelector("#st-grn-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = await db.nextSequence("SGR");
    const status = isAdmin ? "Approved" : "Pending Approval";
    const itemName = fd.get("itemName");
    const qty = Number(fd.get("qty"));
    await db.add("store_purchases", {
      id,
      grnDate: todayISO(),
      invoiceNo: fd.get("invoiceNo"),
      supplier: fd.get("supplier"),
      items: [{ itemName, qty }],
      netTotal: Number(fd.get("netTotal")),
      status,
      enteredBy: auth.getCurrentUser().username,
      approvedBy: isAdmin ? auth.getCurrentUser().username : ""
    });
    if (isAdmin) {
      const match = items.find((x) => x.name === itemName);
      if (match) await db.update("store_items", match.id, { stock: Number(match.stock) + qty });
      else await db.add("store_items", { name: itemName, category: "General", unit: "Unit", stock: qty, minLevel: 5 });
    }
    toast(isAdmin ? `Store GRN ${id} approved!` : `Store GRN ${id} submitted for Admin approval.`, "success");
    renderStoreModule(container, viewId);
  };

  container.querySelector("#st-iss-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = items.find((i) => i.id === fd.get("itemId"));
    const qty = Number(fd.get("qty"));
    if (!item || qty > Number(item.stock)) return toast("Insufficient store stock.", "error");
    await db.update("store_items", item.id, { stock: Number(item.stock) - qty });
    await db.add("store_issues", { issueDate: todayISO(), itemName: item.name, dept: fd.get("dept"), qty, issuedBy: auth.getCurrentUser().username });
    toast(`Issued ${qty} ${item.name} to ${fd.get("dept")}.`, "success");
    renderStoreModule(container, viewId);
  };
}

async function renderAmbulanceModule(container, viewId) {
  const [fleet, trips] = await Promise.all([db.list("ambulances"), db.list("ambulance_trips")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Ambulance Fleet, Dispatch &amp; Trip Billing (${esc(viewId.replace("amb_", "").toUpperCase())})</h2></div></div>
    <div class="card">
      <form id="amb-form" class="form-grid">
        <div class="form-group"><label>Ambulance</label><select name="regNo">${fleet.map((f) => `<option>${esc(f.regNo)} — ${esc(f.type)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Patient / Caller *</label><input name="patientName" required /></div>
        <div class="form-group"><label>Pickup Location *</label><input name="pickup" required /></div>
        <div class="form-group"><label>Distance (Km)</label><input name="km" type="number" value="12" required /></div>
        <div class="form-group"><label>Trip Charge (₹)</label><input name="charge" type="number" value="1500" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-danger">Dispatch &amp; Create Trip Bill</button></div>
      </form>
    </div>
    <div class="card"><div id="amb-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#amb-tbl"), {
    columns: [{ key: "tripDate", label: "Date" }, { key: "regNo", label: "Vehicle" }, { key: "patientName", label: "Patient" }, { key: "pickup", label: "Pickup" }, { key: "km", label: "KM" }, { key: "charge", label: "Charge", render: (t) => money(t.charge) }],
    rows: trips,
    printTitle: "Ambulance Trip & Mileage Report"
  });
  container.querySelector("#amb-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("ambulance_trips", { tripDate: todayISO(), regNo: fd.get("regNo"), patientName: fd.get("patientName"), pickup: fd.get("pickup"), km: Number(fd.get("km")), charge: Number(fd.get("charge")) });
    const billNo = await db.nextSequence("INV");
    await db.add("cashier_bills", { id: billNo, billDate: todayISO(), uhid: "AMBULANCE", patientName: fd.get("patientName"), doctorName: "Emergency EMS", category: "Emergency", items: [{ desc: `Ambulance Trip (${fd.get("km")} km)`, qty: 1, rate: Number(fd.get("charge")), total: Number(fd.get("charge")) }], amount: Number(fd.get("charge")), discount: 0, netAmount: Number(fd.get("charge")), paymentMode: "Cash", status: "Paid", cashier: auth.getCurrentUser().username });
    toast(`Ambulance dispatched & Invoice ${billNo} posted!`, "success");
    renderAmbulanceModule(container, viewId);
  };
}

async function renderSkinModule(container, viewId) {
  const [patients, visits] = await Promise.all([db.list("patients"), db.list("skin_procedures")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Dermatology &amp; Aesthetic Skin Clinic (${esc(viewId.replace("skin_", "").toUpperCase())})</h2></div></div>
    <div class="card">
      <form id="skin-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="patient">${patients.map((p) => `<option value="${esc(p.uhid)}|${esc(p.fullName)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Procedure / Package</label><select name="procedureName"><option>Chemical Peel Session</option><option>Laser Hair Reduction</option><option>PRP Hair Restoration</option><option>Acne Scar Microneedling</option></select></div>
        <div class="form-group"><label>Package Fee (₹)</label><input name="fee" type="number" value="2500" required /></div>
        <div class="form-group"><label>Clinical Notes</label><input name="notes" placeholder="Fitzpatrick skin type / follow-up interval" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Save &amp; Bill Skin Session</button></div>
      </form>
    </div>
    <div class="card"><div id="skin-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#skin-tbl"), {
    columns: [{ key: "procDate", label: "Date" }, { key: "uhid", label: "UHID" }, { key: "patientName", label: "Patient" }, { key: "procedureName", label: "Procedure" }, { key: "fee", label: "Fee", render: (r) => money(r.fee) }, { key: "notes", label: "Notes" }],
    rows: visits,
    printTitle: "Skin & Aesthetics Report"
  });
  container.querySelector("#skin-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const [uhid, patientName] = String(fd.get("patient")).split("|");
    const fee = Number(fd.get("fee"));
    await db.add("skin_procedures", { procDate: todayISO(), uhid, patientName, procedureName: fd.get("procedureName"), fee, notes: fd.get("notes") });
    const billNo = await db.nextSequence("INV");
    await db.add("cashier_bills", { id: billNo, billDate: todayISO(), uhid, patientName, doctorName: "Dermatology", category: "Skin Procedure", items: [{ desc: fd.get("procedureName"), qty: 1, rate: fee, total: fee }], amount: fee, discount: 0, netAmount: fee, paymentMode: "Cash", status: "Paid", cashier: auth.getCurrentUser().username });
    toast(`Skin procedure billed (${billNo}).`, "success");
    renderSkinModule(container, viewId);
  };
}
