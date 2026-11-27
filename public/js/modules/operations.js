/**
 * Operations & Remaining Departmental Modules:
 * Facility Hub (Executive Dashboard, Maintenance, Gate Pass, Documents),
 * CuraTech (Password, Leave Request, About, Helpdesk),
 * Certificate, Equipments, Physiotherapy, Store, Ambulance, and Skin.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, toast } from "../ui.js";
import { printA4Document } from "../print.js";

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
    case "about_curatech":
      return renderAboutSystem(container);
    case "ask_curatech":
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
  const [patients, visits, rooms, meds, labs, bills, pharmaSales, grns, cfg] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("rooms"),
    db.list("medicines"),
    db.list("lab_orders"),
    db.list("cashier_bills"),
    db.list("pharmacy_sales"),
    db.list("pharmacy_purchases"),
    db.getHospitalSettings()
  ]);
  const today = todayISO();
  const todayOp = visits.filter((v) => v.visitDate === today).length;
  const occBeds = rooms.filter((r) => r.status === "Occupied").length;
  const pendingLab = labs.filter((l) => l.status !== "Verified").length;
  const lowStock = meds.filter((m) => Number(m.stock) <= Number(cfg.lowStockThreshold || 20));
  const pendingGrn = grns.filter((g) => g.status === "Pending Approval").length;
  const todayCash = bills.filter((b) => b.billDate === today && b.status === "Paid").reduce((s, b) => s + Number(b.paidAmount || 0), 0);
  const todayPharma = pharmaSales.filter((p) => p.billDate === today && p.status === "Paid").reduce((s, p) => s + Number(p.netTotal || 0), 0);

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Executive Facility Oversight Dashboard</h2>
        <p>${esc(cfg.hospitalName)} — Real-time clinical, pharmacy, diagnostic &amp; financial pulse.</p>
      </div>
      <div class="module-actions">
        <button class="btn btn-primary" data-jump="patient_new">+ New Patient</button>
        <button class="btn btn-success" data-jump="pharma_general_pos">Pharmacy POS</button>
        <button class="btn" data-jump="cashier_dashboard">Cashier Billing</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Registered Patients</div><div class="kpi-value">${patients.length}</div><div class="kpi-sub">Today's OP Visits: ${todayOp}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Bed Occupancy</div><div class="kpi-value">${occBeds} / ${rooms.length}</div><div class="kpi-sub">Available: ${rooms.filter((r) => r.status === "Available").length} beds</div></div>
      <div class="kpi-card cyan"><div class="kpi-label">Today's Pharmacy</div><div class="kpi-value">${money(todayPharma)}</div><div class="kpi-sub">Low-stock alerts: ${lowStock.length}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Pending Lab Tests</div><div class="kpi-value">${pendingLab}</div><div class="kpi-sub">Pending GRN Approvals: ${pendingGrn}</div></div>
      ${auth.hasPermission("view_financial_reports") ? `<div class="kpi-card green"><div class="kpi-label">Today's Hospital Cash</div><div class="kpi-value">${money(todayCash)}</div><div class="kpi-sub">Admin Financial View</div></div>` : ""}
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Low Stock &amp; Reorder Pharmacy Alerts (${lowStock.length})</h3>
        ${lowStock.length ? `<table class="data-table"><thead><tr><th>Medicine</th><th>Batch</th><th>Stock</th><th>Expiry</th></tr></thead><tbody>${lowStock.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.batchNo)}</td><td><span class="badge badge-red">${m.stock}</span></td><td>${esc(m.expiry)}</td></tr>`).join("")}</tbody></table>` : `<div class="alert alert-success">All pharmacy medicines are above minimum threshold.</div>`}
      </div>
      <div class="card">
        <h3 class="card-title">Today's Clinical Queue (${todayOp})</h3>
        ${visits.slice(0, 6).map((v) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);"><span><strong>#${v.tokenNo}</strong> ${esc(v.patientName)} (${esc(v.doctorName)})</span><span class="badge ${v.status === "Completed" ? "badge-green" : "badge-amber"}">${esc(v.status)}</span></div>`).join("") || `<div class="alert alert-info">No OP visits recorded today.</div>`}
      </div>
    </div>
  `;

  if (openViewFn) {
    container.querySelectorAll("button[data-jump]").forEach((b) => {
      b.onclick = () => openViewFn(b.dataset.jump, b.textContent.trim(), {});
    });
  }
}

async function renderEquipments(container, viewId) {
  const list = await db.list("equipments");
  const isReport = viewId === "service_report";
  container.innerHTML = `
    <div class="module-header"><div><h2>Biomedical Equipment Lifecycle &amp; Calibration</h2><p>Track medical assets, AMC vendors, calibration schedules, and breakdown logs.</p></div></div>
    ${!isReport ? `
    <div class="card">
      <form id="eq-form" class="form-grid">
        <div class="form-group"><label>Equipment Name *</label><input name="name" required placeholder="e.g. ECG Machine 12-Channel" /></div>
        <div class="form-group"><label>Department</label><input name="dept" value="Cardiology" /></div>
        <div class="form-group"><label>Serial No *</label><input name="serialNo" required /></div>
        <div class="form-group"><label>Next Calibration</label><input name="nextCalibration" type="date" value="${todayISO()}" /></div>
        <div class="form-group"><label>AMC Vendor</label><input name="amcVendor" value="Authorized Service" /></div>
        <div class="form-group"><label>Status</label><select name="status"><option>Operational</option><option>Under Calibration</option><option>Breakdown / Repair</option></select></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">+ Register Equipment</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="eq-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#eq-tbl"), {
    columns: [
      { key: "name", label: "Equipment" },
      { key: "dept", label: "Department" },
      { key: "serialNo", label: "Serial No" },
      { key: "nextCalibration", label: "Next Calibration" },
      { key: "amcVendor", label: "AMC Vendor" },
      { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "Operational" ? "badge-green" : "badge-amber"}">${esc(r.status)}</span>` }
    ],
    rows: list,
    exportFileName: "biomedical-equipments.csv",
    printTitle: "Biomedical Equipment & Calibration Audit"
  });
  if (!isReport) {
    container.querySelector("#eq-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("equipments", Object.fromEntries(fd.entries()));
      toast("Equipment saved.", "success");
      renderEquipments(container, viewId);
    };
  }
}

async function renderWorksheet(container, reportOnly) {
  const rows = await db.list("daily_worksheets");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Daily Worksheet Compliance Report" : "Facility Maintenance Daily Worksheet"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="ws-form" class="form-grid">
        <div class="form-group"><label>Task Area</label><select name="area"><option>ICU Sanitization</option><option>Generator Check</option><option>Water RO Plant</option><option>Medical Gas Manifold</option></select></div>
        <div class="form-group form-span-2"><label>Inspection Notes *</label><input name="notes" required placeholder="All parameters normal" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Log Worksheet</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="ws-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ws-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "area", label: "Facility Area" },
      { key: "notes", label: "Inspection Notes" },
      { key: "staff", label: "Verified By" }
    ],
    rows,
    exportFileName: "daily-worksheets.csv",
    printTitle: "Facility Maintenance Worksheet Report"
  });
  if (!reportOnly) {
    container.querySelector("#ws-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("daily_worksheets", { date: todayISO(), area: fd.get("area"), notes: fd.get("notes"), staff: auth.getCurrentUser().username });
      toast("Worksheet entry logged.", "success");
      renderWorksheet(container, reportOnly);
    };
  }
}

async function renderGatePass(container, reportOnly) {
  const passes = await db.list("gate_passes");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Gate Pass Movement Report" : "Gate Pass Management"}</h2><p>Issue visitor, patient discharge, or material exit passes.</p></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="gp-form" class="form-grid">
        <div class="form-group"><label>Pass Type</label><select name="passType"><option>Visitor Pass</option><option>Patient Attendant</option><option>Material Outward</option></select></div>
        <div class="form-group"><label>Person / Carrier Name *</label><input name="personName" required /></div>
        <div class="form-group"><label>Purpose / Items *</label><input name="purpose" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Issue Gate Pass</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="gp-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#gp-tbl"), {
    columns: [
      { key: "passNo", label: "Pass No" },
      { key: "date", label: "Date" },
      { key: "passType", label: "Type" },
      { key: "personName", label: "Name" },
      { key: "purpose", label: "Purpose" },
      { key: "issuedBy", label: "Issued By" }
    ],
    rows: passes,
    exportFileName: "gate-passes.csv",
    printTitle: "Gate Pass Register"
  });
  if (!reportOnly) {
    container.querySelector("#gp-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const passNo = `GP-${Date.now().toString().slice(-5)}`;
      await db.add("gate_passes", { passNo, date: todayISO(), passType: fd.get("passType"), personName: fd.get("personName"), purpose: fd.get("purpose"), issuedBy: auth.getCurrentUser().username });
      toast(`Gate Pass ${passNo} issued.`, "success");
      renderGatePass(container, reportOnly);
    };
  }
}

async function renderDocumentArchive(container, reportOnly) {
  const docs = await db.list("hospital_documents");
  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Archived Documents Report" : "Centralized Hospital Document Archive"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="doc-up-form" class="form-grid">
        <div class="form-group"><label>Document Title *</label><input name="title" required placeholder="e.g. Fire NOC 2026 / Patient Consent" /></div>
        <div class="form-group"><label>Category</label><select name="category"><option>Statutory License</option><option>Patient Record</option><option>Vendor Contract</option><option>SOP / Policy</option></select></div>
        <div class="form-group"><label>Select File</label><input name="file" type="file" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Archive Document</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="doc-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#doc-tbl"), {
    columns: [
      { key: "uploadDate", label: "Date" },
      { key: "title", label: "Document Title" },
      { key: "category", label: "Category" },
      { key: "fileName", label: "File Name" },
      { key: "uploadedBy", label: "Uploaded By" }
    ],
    rows: docs,
    exportFileName: "documents-archive.csv"
  });
  if (!reportOnly) {
    container.querySelector("#doc-up-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const file = fd.get("file");
      await db.add("hospital_documents", {
        uploadDate: todayISO(),
        title: fd.get("title"),
        category: fd.get("category"),
        fileName: file && file.name ? file.name : "manual-record.pdf",
        uploadedBy: auth.getCurrentUser().username
      });
      toast("Document archived.", "success");
      renderDocumentArchive(container, reportOnly);
    };
  }
}

async function renderChangePassword(container) {
  container.innerHTML = `
    <div class="module-header"><div><h2>Change My Account Password</h2><p>Self-service credential update for ${esc(auth.getCurrentUser().username)}.</p></div></div>
    <div class="card" style="max-width:480px;">
      <form id="chg-pw-form" class="form-grid">
        <div class="form-group form-span-2"><label>Current Password *</label><input name="currentPw" type="password" required /></div>
        <div class="form-group form-span-2"><label>New Password (min 6 chars) *</label><input name="newPw" type="password" minlength="6" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Update Password</button></div>
      </form>
    </div>
  `;
  container.querySelector("#chg-pw-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await auth.changeOwnPassword(fd.get("currentPw"), fd.get("newPw"));
      toast("Password changed successfully!", "success");
      e.target.reset();
    } catch (err) {
      toast(err.message, "error");
    }
  };
}

async function renderLeaveRequest(container) {
  const user = auth.getCurrentUser();
  const leaves = (await db.list("leave_requests")).filter((l) => l.username === user.username || auth.isAdmin());
  container.innerHTML = `
    <div class="module-header"><div><h2>Employee Leave Request</h2><p>Apply for casual, medical, or earned leave and track Admin approval status.</p></div></div>
    <div class="card">
      <form id="lv-form" class="form-grid">
        <div class="form-group"><label>Leave Type</label><select name="leaveType"><option>Casual Leave</option><option>Medical Leave</option><option>Earned Leave</option></select></div>
        <div class="form-group"><label>From Date *</label><input name="fromDate" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>To Date *</label><input name="toDate" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Reason *</label><input name="reason" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Submit Leave Application</button></div>
      </form>
    </div>
    <div class="card"><div id="lv-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lv-tbl"), {
    columns: [
      { key: "username", label: "Employee" },
      { key: "leaveType", label: "Type" },
      { key: "fromDate", label: "From" },
      { key: "toDate", label: "To" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status", render: (l) => `<span class="badge ${l.status === "Approved" ? "badge-green" : l.status === "Rejected" ? "badge-red" : "badge-amber"}">${esc(l.status)}</span>` }
    ],
    rows: leaves
  });
  container.querySelector("#lv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("leave_requests", { username: user.username, leaveType: fd.get("leaveType"), fromDate: fd.get("fromDate"), toDate: fd.get("toDate"), reason: fd.get("reason"), status: "Pending" });
    toast("Leave request submitted.", "success");
    renderLeaveRequest(container);
  };
}

async function renderAboutSystem(container) {
  const cfg = await db.getHospitalSettings();
  container.innerHTML = `
    <div class="module-header"><div><h2>About CuraTech Hospital Management ERP</h2></div></div>
    <div class="card">
      <p><strong>Application:</strong> CuraTech Hospital Management v2.0 (Enterprise Ribbon Web ERP)</p>
      <p><strong>Hospital Facility:</strong> ${esc(cfg.hospitalName)} — ${esc(cfg.branchName)}</p>
      <p><strong>Database Mode:</strong> ${db.getMode() === "firebase" ? "Firebase Cloud Firestore (Real-Time Live)" : "Local Offline Sandbox (Ready for Firebase Keys)"}</p>
      <p><strong>Security Policy:</strong> Session-only persistence with automatic logout on browser/tab exit and inactivity.</p>
    </div>
  `;
}

async function renderAskSupport(container) {
  container.innerHTML = `
    <div class="module-header"><div><h2>Ask CuraTech — Internal Support Desk</h2><p>Submit IT, billing, or software queries directly to Hospital Admin.</p></div></div>
    <div class="card">
      <form id="sup-form" class="form-grid">
        <div class="form-group form-span-2"><label>Subject *</label><input name="subject" required placeholder="e.g. Printer calibration or new medicine addition" /></div>
        <div class="form-group form-span-2"><label>Detailed Query *</label><textarea name="message" rows="3" required></textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Submit Query</button></div>
      </form>
    </div>
  `;
  container.querySelector("#sup-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("support_tickets", { subject: fd.get("subject"), message: fd.get("message"), submittedBy: auth.getCurrentUser().username, status: "Open" });
    toast("Support ticket sent to Admin.", "success");
    e.target.reset();
  };
}

async function renderCertificateModule(container, certType, registerOnly) {
  const [patients, certs] = await Promise.all([db.list("patients"), db.list("certificates")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>${registerOnly ? "Certificate Register" : `Issue ${esc(certType)}`}</h2><p>Generate official printable medical, fitness, birth, and death certificates.</p></div></div>
    ${!registerOnly ? `
    <div class="card">
      <form id="cert-form" class="form-grid">
        <div class="form-group"><label>Certificate Type</label><select name="certType"><option ${certType === "Medical Certificate" ? "selected" : ""}>Medical Certificate</option><option ${certType === "Fitness Certificate" ? "selected" : ""}>Fitness Certificate</option><option ${certType === "Birth Certificate" ? "selected" : ""}>Birth Certificate</option><option ${certType === "Death Certificate" ? "selected" : ""}>Death Certificate</option></select></div>
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Issue Date</label><input name="issueDate" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Certifying Doctor</label><input name="doctorName" value="Dr. Thiruppathi R" required /></div>
        <div class="form-group form-span-2"><label>Clinical Statement / Findings *</label><textarea name="statement" rows="2" required>This is to certify that the above patient was examined and is medically fit to resume normal duties.</textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Issue &amp; Print Certificate</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="cert-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#cert-tbl"), {
    columns: [
      { key: "certNo", label: "Cert No" },
      { key: "issueDate", label: "Date" },
      { key: "certType", label: "Type" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" }
    ],
    rows: certs
  });
  if (!registerOnly) {
    container.querySelector("#cert-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const pat = patients.find((p) => p.uhid === fd.get("uhid"));
      const certNo = `CERT-${Date.now().toString().slice(-5)}`;
      await db.add("certificates", { certNo, certType: fd.get("certType"), issueDate: fd.get("issueDate"), uhid: pat.uhid, patientName: pat.fullName, doctorName: fd.get("doctorName"), statement: fd.get("statement") });
      toast(`Certificate ${certNo} issued!`, "success");
      await printA4Document({
        docTitle: fd.get("certType"),
        metaPairs: [["Certificate No", certNo], ["Date", fd.get("issueDate")], ["Patient", pat.fullName], ["UHID", pat.uhid]],
        bodyHtml: `<p style="font-size:14px;line-height:1.7;margin:18px 0;">${esc(fd.get("statement"))}</p>`,
        signatureLabel: fd.get("doctorName")
      });
      renderCertificateModule(container, certType, registerOnly);
    };
  }
}

async function renderPhysiotherapy(container, viewId) {
  const [patients, sessions] = await Promise.all([db.list("patients"), db.list("physio_sessions")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Physiotherapy &amp; Rehabilitation (${esc(viewId.replace("physio_", ""))})</h2></div></div>
    <div class="card">
      <form id="phy-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Modality / Therapy</label><select name="therapy"><option>IFT + Ultrasound Therapy</option><option>TENS &amp; Mobilization</option><option>Post-Op Knee Rehab</option></select></div>
        <div class="form-group"><label>Pain / Outcome Score (0-10)</label><input name="score" type="number" min="0" max="10" value="5" /></div>
        <div class="form-group"><label>Fee (₹)</label><input name="fee" type="number" value="400" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Record Therapy Session</button></div>
      </form>
    </div>
    <div class="card"><div id="phy-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#phy-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "therapy", label: "Modality" },
      { key: "score", label: "Outcome Score" },
      { key: "fee", label: "Fee", render: (r) => money(r.fee) }
    ],
    rows: sessions,
    exportFileName: "physiotherapy-sessions.csv"
  });
  container.querySelector("#phy-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    await db.add("physio_sessions", { date: todayISO(), uhid: pat.uhid, patientName: pat.fullName, therapy: fd.get("therapy"), score: fd.get("score"), fee: Number(fd.get("fee")) });
    toast("Physiotherapy session logged.", "success");
    renderPhysiotherapy(container, viewId);
  };
}

async function renderStoreModule(container, viewId) {
  const [items, purchases] = await Promise.all([db.list("store_items"), db.list("store_purchases")]);
  const isAdmin = auth.hasPermission("approve_grn");
  container.innerHTML = `
    <div class="module-header"><div><h2>Central Non-Medical General Store</h2><p>Linen, stationery, housekeeping, and hospital supplies inventory.</p></div></div>
    <div class="card">
      <form id="st-grn-form" class="form-grid">
        <div class="form-group"><label>Item Name *</label><input name="itemName" required placeholder="e.g. Bed Sheets / Thermal Rolls" /></div>
        <div class="form-group"><label>Supplier *</label><input name="supplier" required placeholder="Vendor Name" /></div>
        <div class="form-group"><label>Invoice No *</label><input name="invoiceNo" required /></div>
        <div class="form-group"><label>Qty *</label><input name="qty" type="number" min="1" value="25" required /></div>
        <div class="form-group"><label>Total Amount (₹)</label><input name="netTotal" type="number" value="2500" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">${isAdmin ? "Post Store GRN" : "Submit Store GRN for Admin Approval"}</button></div>
      </form>
    </div>
    <div class="card"><h3 class="card-title">Store Stock &amp; GRNs</h3><div id="st-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#st-tbl"), {
    columns: [
      { key: "grnDate", label: "Date" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "supplier", label: "Supplier" },
      { key: "netTotal", label: "Net Amt", render: (p) => money(p.netTotal) },
      { key: "status", label: "Status", render: (p) => `<span class="badge ${p.status === "Approved" ? "badge-green" : "badge-amber"}">${esc(p.status)}</span>` }
    ],
    rows: purchases.length ? purchases : items
  });
  container.querySelector("#st-grn-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const status = isAdmin ? "Approved" : "Pending Approval";
    await db.add("store_purchases", {
      grnDate: todayISO(),
      invoiceNo: fd.get("invoiceNo"),
      supplier: fd.get("supplier"),
      items: [{ itemName: fd.get("itemName"), qty: Number(fd.get("qty")) }],
      netTotal: Number(fd.get("netTotal")),
      status,
      enteredBy: auth.getCurrentUser().username
    });
    if (isAdmin) {
      await db.add("store_items", { name: fd.get("itemName"), category: "General", qty: Number(fd.get("qty")), unit: "Nos" });
    }
    toast(`Store GRN saved (${status}).`, isAdmin ? "success" : "warn");
    renderStoreModule(container, viewId);
  };
}

async function renderAmbulanceModule(container, viewId) {
  const trips = await db.list("ambulance_trips");
  container.innerHTML = `
    <div class="module-header"><div><h2>Ambulance Fleet &amp; Emergency Dispatch</h2><p>Track ambulance dispatches, driver duty, mileage, and trip billing.</p></div></div>
    <div class="card">
      <form id="amb-form" class="form-grid">
        <div class="form-group"><label>Vehicle No *</label><select name="vehicle"><option>TN-01-AMB-108 (ICU)</option><option>TN-01-AMB-204 (BLS)</option></select></div>
        <div class="form-group"><label>Driver Name *</label><input name="driver" required value="Murugan S" /></div>
        <div class="form-group"><label>Patient / Caller *</label><input name="patientName" required /></div>
        <div class="form-group"><label>Route / Pickup *</label><input name="route" required /></div>
        <div class="form-group"><label>Distance (KM)</label><input name="km" type="number" value="15" /></div>
        <div class="form-group"><label>Trip Charge (₹)</label><input name="charge" type="number" value="1200" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-danger">Dispatch Ambulance &amp; Bill</button></div>
      </form>
    </div>
    <div class="card"><div id="amb-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#amb-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "vehicle", label: "Ambulance" },
      { key: "driver", label: "Driver" },
      { key: "patientName", label: "Patient" },
      { key: "route", label: "Route" },
      { key: "km", label: "KM" },
      { key: "charge", label: "Charge", render: (t) => money(t.charge) }
    ],
    rows: trips,
    exportFileName: "ambulance-trips.csv"
  });
  container.querySelector("#amb-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const charge = Number(fd.get("charge"));
    await db.add("ambulance_trips", { date: todayISO(), vehicle: fd.get("vehicle"), driver: fd.get("driver"), patientName: fd.get("patientName"), route: fd.get("route"), km: Number(fd.get("km")), charge });
    const billId = await db.nextSequence("CSH");
    await db.add("cashier_bills", {
      id: billId, billDate: todayISO(), uhid: "AMBULANCE", patientName: fd.get("patientName"), doctorName: "-", department: "Ambulance",
      items: [{ desc: `Ambulance Trip (${fd.get("route")})`, qty: 1, rate: charge, amount: charge }],
      grossAmount: charge, discount: 0, netAmount: charge, paidAmount: 0, paymentMode: "Pending", status: "Pending", billedBy: auth.getCurrentUser().username
    });
    toast(`Ambulance dispatched and Cashier Bill ${billId} queued.`, "success");
    renderAmbulanceModule(container, viewId);
  };
}

async function renderSkinModule(container, viewId) {
  const [patients, skinLogs] = await Promise.all([db.list("patients"), db.list("skin_procedures")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Dermatology &amp; Aesthetic Skin Clinic</h2><p>Consultations, laser/peel/PRP packages, clinical notes, and aesthetic billing.</p></div></div>
    <div class="card">
      <form id="skin-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Aesthetic Package / Procedure</label><select name="procedure"><option>Chemical Peel Session</option><option>Laser Hair Reduction</option><option>PRP Skin Rejuvenation</option><option>Acne Scar Microneedling</option></select></div>
        <div class="form-group"><label>Session No</label><input name="sessionNo" type="number" value="1" /></div>
        <div class="form-group"><label>Package Fee (₹)</label><input name="fee" type="number" value="2500" /></div>
        <div class="form-group form-span-2"><label>Dermatologist Notes</label><input name="notes" value="Sunscreen SPF 50 advised post procedure" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Save Skin Session &amp; Queue Bill</button></div>
      </form>
    </div>
    <div class="card"><div id="skin-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#skin-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "procedure", label: "Procedure" },
      { key: "sessionNo", label: "Session #" },
      { key: "fee", label: "Fee", render: (s) => money(s.fee) }
    ],
    rows: skinLogs,
    exportFileName: "skin-clinic-report.csv"
  });
  container.querySelector("#skin-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    const fee = Number(fd.get("fee"));
    await db.add("skin_procedures", { date: todayISO(), uhid: pat.uhid, patientName: pat.fullName, procedure: fd.get("procedure"), sessionNo: fd.get("sessionNo"), fee, notes: fd.get("notes") });
    const billId = await db.nextSequence("CSH");
    await db.add("cashier_bills", {
      id: billId, billDate: todayISO(), uhid: pat.uhid, patientName: pat.fullName, doctorName: "Dr. Ananya M", department: "Skin Clinic",
      items: [{ desc: fd.get("procedure"), qty: 1, rate: fee, amount: fee }],
      grossAmount: fee, discount: 0, netAmount: fee, paidAmount: 0, paymentMode: "Pending", status: "Pending", billedBy: auth.getCurrentUser().username
    });
    toast(`Skin session saved and billed (${billId}).`, "success");
    renderSkinModule(container, viewId);
  };
}
