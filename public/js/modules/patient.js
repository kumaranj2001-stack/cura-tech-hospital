/**
 * Patient Reception, Registration, OP Queue/Appointments, IP Admission,
 * Bed & Room Occupancy Dashboard, IP Services & Discharge, Alerts/SMS & Duty Roster.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, money, todayISO, mountDataTable, openModal, closeModal, toast } from "../ui.js";
import { renderBarcodeSVG } from "../barcode.js";
import { printA4Document, printThermalBill } from "../print.js";
import { queueOrSendNotification } from "../sms.js";

export async function renderPatientView(viewId, container, params = {}) {
  switch (viewId) {
    case "patient_new":
      return renderNewPatient(container);
    case "patient_edit":
      return renderEditPatients(container);
    case "op_registration":
      return renderOpRegistration(container);
    case "op_tokens":
      return renderOpTokens(container);
    case "op_appointments":
      return renderAppointments(container);
    case "related_patients":
      return renderRelatedPatients(container);
    case "op_test_rx":
      return renderOpTestRx(container);
    case "patient_call_log":
      return renderCallLog(container);
    case "ip_admission":
      return renderIpAdmission(container);
    case "ip_bed_dashboard":
      return renderBedDashboard(container);
    case "room_management":
      return renderRoomManagement(container, params);
    case "ip_edit":
      return renderIpEdit(container);
    case "ip_service_log":
    case "ip_misc_services":
      return renderIpServiceLog(container, viewId === "ip_misc_services");
    case "ip_discharge":
      return renderIpDischarge(container);
    case "test_enquiry":
      return renderTestEnquiry(container);
    case "alerts_queue":
      return renderAlertsQueue(container, params.scope || "Patients");
    case "send_sms":
      return renderSendSms(container);
    case "duty_allotment":
      return renderDutyAllotment(container, params.role || "Doctor");
    default:
      return renderOpRegistration(container);
  }
}

async function renderNewPatient(container) {
  const [patients, cfg] = await Promise.all([db.list("patients"), db.getHospitalSettings()]);
  const prefix = (cfg.uhidPrefix || "CVH").toUpperCase();

  container.innerHTML = `
    <div class="module-header">
      <div><h2>New Patient Registration</h2><p>Register demographics, generate UHID (${esc(prefix)}) &amp; barcode, emergency contacts, and insurance.</p></div>
    </div>
    <div class="card">
      <form id="new-pat-form">
        <div class="form-grid">
          <div class="form-group"><label>Full Name *</label><input name="fullName" required placeholder="e.g. KARTHIK RAJA" /></div>
          <div class="form-group"><label>Age (Years) *</label><input name="age" type="number" min="0" max="125" required /></div>
          <div class="form-group"><label>Gender *</label><select name="gender"><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div class="form-group"><label>Mobile Number *</label><input name="phone" required placeholder="10-digit mobile" /></div>
          <div class="form-group"><label>Blood Group</label><select name="bloodGroup"><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></div>
          <div class="form-group"><label>City</label><input name="city" value="Chennai" /></div>
          <div class="form-group form-span-2"><label>Address</label><input name="address" placeholder="Door No, Street, Area" /></div>
          <div class="form-group"><label>Emergency Contact</label><input name="emergencyContact" placeholder="Name &amp; Phone" /></div>
          <div class="form-group"><label>Referral Source</label><select name="referralSource"><option>Walk-in</option><option>Doctor Referral</option><option>Old Patient</option><option>Camp / Corporate</option></select></div>
          <div class="form-group"><label>Insurance Provider</label><input name="insuranceProvider" value="Self Pay" /></div>
          <div class="form-group"><label>Policy / Member ID</label><input name="policyNo" placeholder="Optional" /></div>
          <div class="form-group form-span-2"><label>Known Allergies</label><input name="allergies" value="None" /></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Register &amp; Generate UHID</button>
        </div>
      </form>
    </div>
    <div class="card">
      <h3 class="card-title">Recently Registered Patients (${patients.length})</h3>
      <div id="recent-pat-tbl"></div>
    </div>
  `;

  mountDataTable(container.querySelector("#recent-pat-tbl"), {
    columns: [
      { key: "uhid", label: "UHID", render: (p) => `<strong>${esc(p.uhid)}</strong>` },
      { key: "fullName", label: "Patient Name" },
      { key: "age", label: "Age/Sex", render: (p) => `${esc(p.age)} / ${esc(p.gender)}` },
      { key: "phone", label: "Phone" },
      { key: "insuranceProvider", label: "Insurance" },
      {
        key: "act",
        label: "Card",
        noExport: true,
        render: (p) => `<button class="btn btn-sm" data-card="${esc(p.id)}">ID Card</button>`
      }
    ],
    rows: patients.slice(0, 15),
    searchPlaceholder: "Search UHID, name, phone..."
  });

  container.querySelector("#recent-pat-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-card]");
    if (!btn) return;
    const p = patients.find((x) => x.id === btn.dataset.card);
    if (!p) return;
    printA4Document({
      docTitle: "Patient Identification & UHID Card",
      metaPairs: [["UHID", p.uhid], ["Patient Name", p.fullName], ["Age / Gender", `${p.age} / ${p.gender}`], ["Blood Group", p.bloodGroup], ["Phone", p.phone], ["Allergies", p.allergies || "None"]],
      bodyHtml: `<div style="text-align:center;margin-top:16px;">${renderBarcodeSVG(p.uhid, 46)}</div>`
    });
  };

  container.querySelector("#new-pat-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const uhid = await db.nextSequence(prefix);
    const pat = await db.add("patients", {
      uhid,
      fullName: String(fd.get("fullName")).toUpperCase(),
      age: Number(fd.get("age")),
      gender: fd.get("gender"),
      phone: fd.get("phone"),
      bloodGroup: fd.get("bloodGroup"),
      city: fd.get("city"),
      address: fd.get("address"),
      emergencyContact: fd.get("emergencyContact"),
      referralSource: fd.get("referralSource"),
      insuranceProvider: fd.get("insuranceProvider"),
      policyNo: fd.get("policyNo"),
      allergies: fd.get("allergies")
    });
    await auth.logAudit("NEW_PATIENT", "Patient", `Registered ${pat.uhid} - ${pat.fullName}`);
    toast(`Patient registered with UHID ${pat.uhid}`, "success");
    renderNewPatient(container);
  };
}

async function renderEditPatients(container) {
  const patients = await db.list("patients");
  container.innerHTML = `
    <div class="module-header"><div><h2>Edit Patients &amp; Demographic Directory</h2><p>Search any patient by UHID, name, or phone and update demographics.</p></div></div>
    <div class="card"><div id="edit-pat-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#edit-pat-tbl"), {
    columns: [
      { key: "uhid", label: "UHID" },
      { key: "fullName", label: "Full Name" },
      { key: "age", label: "Age" },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      { key: "insuranceProvider", label: "Insurance" },
      {
        key: "edit",
        label: "Action",
        noExport: true,
        render: (p) => `<button class="btn btn-sm btn-primary" data-ep="${esc(p.id)}">Edit</button>`
      }
    ],
    rows: patients,
    exportFileName: "patients-directory.csv",
    printTitle: "See Curavite Hospital Management — Patient Register"
  });

  container.querySelector("#edit-pat-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-ep]");
    if (!btn) return;
    const p = patients.find((x) => x.id === btn.dataset.ep);
    if (!p) return;
    openModal({
      title: `Edit Patient: ${p.uhid}`,
      bodyHtml: `
        <form id="ep-form" class="form-grid">
          <div class="form-group"><label>Full Name</label><input name="fullName" value="${esc(p.fullName)}" required /></div>
          <div class="form-group"><label>Age</label><input name="age" type="number" value="${esc(p.age)}" required /></div>
          <div class="form-group"><label>Phone</label><input name="phone" value="${esc(p.phone)}" required /></div>
          <div class="form-group"><label>City</label><input name="city" value="${esc(p.city || "")}" /></div>
          <div class="form-group form-span-2"><label>Address</label><input name="address" value="${esc(p.address || "")}" /></div>
          <div class="form-group"><label>Insurance</label><input name="insuranceProvider" value="${esc(p.insuranceProvider || "")}" /></div>
          <div class="form-group"><label>Allergies</label><input name="allergies" value="${esc(p.allergies || "None")}" /></div>
          <div class="form-actions form-span-2"><button type="submit" class="btn btn-primary">Save Changes</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#ep-form").onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          await db.update("patients", p.id, {
            fullName: fd.get("fullName"),
            age: Number(fd.get("age")),
            phone: fd.get("phone"),
            city: fd.get("city"),
            address: fd.get("address"),
            insuranceProvider: fd.get("insuranceProvider"),
            allergies: fd.get("allergies")
          });
          toast("Patient record updated.", "success");
          closeModal();
          renderEditPatients(container);
        };
      }
    });
  };
}

async function renderOpRegistration(container) {
  const [patients, visits, masters] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("masters")
  ]);
  const doctors = masters.filter((m) => m.catalog === "Service Providers");

  container.innerHTML = `
    <div class="module-header"><div><h2>Outpatient (OP) Visit Registration &amp; Token</h2><p>Assign consultation token, collect fee, and route patient to Prescreening &amp; Doctor Queue.</p></div></div>
    <div class="card">
      <form id="op-reg-form" class="form-grid">
        <div class="form-group form-span-2">
          <label>Select Patient *</label>
          <select name="patientId" required>
            ${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)} (${esc(p.phone)})</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Consulting Doctor *</label>
          <select name="doctorName" required>
            ${doctors.map((d) => `<option value="${esc(d.name)}">${esc(d.name)}</option>`).join("")}
            <option value="Dr. General Duty Medical Officer">Dr. General Duty Medical Officer</option>
          </select>
        </div>
        <div class="form-group"><label>Visit Type</label><select name="visitType"><option>New Consultation</option><option>Review Visit</option><option>Emergency OP</option></select></div>
        <div class="form-group"><label>Consultation Fee (₹)</label><input name="fee" type="number" value="400" min="0" required /></div>
        <div class="form-group"><label>Payment Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Pending</option></select></div>
        <div class="form-actions form-span-2">
          <button type="submit" class="btn btn-primary">Generate OP Token &amp; Bill</button>
        </div>
      </form>
    </div>
    <div class="card">
      <h3 class="card-title">Today's OP Visits</h3>
      <div id="op-visits-tbl"></div>
    </div>
  `;

  mountDataTable(container.querySelector("#op-visits-tbl"), {
    columns: [
      { key: "tokenNo", label: "Token", render: (v) => `<span class="badge badge-blue">#${esc(v.tokenNo)}</span>` },
      { key: "visitDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "status", label: "Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : "badge-amber"}">${esc(v.status)}</span>` }
    ],
    rows: visits
  });

  container.querySelector("#op-reg-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    if (!pat) return toast("Select a valid patient.", "error");

    const today = todayISO();
    const todayCount = visits.filter((v) => v.visitDate === today).length + 1;
    const tokenNo = `T-${String(todayCount).padStart(2, "0")}`;
    const fee = Number(fd.get("fee") || 0);
    const mode = fd.get("paymentMode");
    const visitId = await db.nextSequence("OP");

    await db.add("op_visits", {
      id: visitId,
      tokenNo,
      visitDate: today,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      visitType: fd.get("visitType"),
      consultationFee: fee,
      status: "Waiting",
      vitals: {},
      chiefComplaint: "",
      diagnosis: ""
    });

    const billNo = await db.nextSequence("INV");
    await db.add("cashier_bills", {
      id: billNo,
      billDate: today,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      department: fd.get("visitType") === "Emergency OP" ? "Emergency" : "OP Consultation",
      items: [{ desc: `OP Consultation - ${fd.get("doctorName")}`, qty: 1, rate: fee, amount: fee }],
      grossAmount: fee,
      discount: 0,
      netAmount: fee,
      paidAmount: mode === "Pending" ? 0 : fee,
      paymentMode: mode,
      status: mode === "Pending" ? "Pending" : "Paid",
      billedBy: auth.getCurrentUser().username
    });

    toast(`OP Token ${tokenNo} generated & billed (${billNo})!`, "success");
    await printThermalBill({
      title: `OP CONSULTATION TOKEN #${tokenNo}`,
      billNo,
      billDate: today,
      patientName: pat.fullName,
      uhid: pat.uhid,
      items: [{ desc: `Consult: ${fd.get("doctorName")}`, qty: 1, amount: fee }],
      subTotal: fee,
      netTotal: fee,
      paymentMode: mode,
      cashier: auth.getCurrentUser().username
    });
    renderOpRegistration(container);
  };
}

async function renderOpTokens(container) {
  const visits = (await db.list("op_visits")).filter((v) => v.visitDate === todayISO());
  container.innerHTML = `
    <div class="module-header"><div><h2>Live OP Token Queue Board</h2><p>Track Waiting, Prescreened, and Completed consultations for ${todayISO()}.</p></div></div>
    <div class="card"><div id="token-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#token-tbl"), {
    columns: [
      { key: "tokenNo", label: "Token #" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "status", label: "Queue Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : v.status === "Prescreened" ? "badge-blue" : "badge-amber"}">${esc(v.status)}</span>` },
      {
        key: "act",
        label: "Update",
        noExport: true,
        render: (v) => v.status !== "Completed" ? `<button class="btn btn-sm btn-success" data-done="${esc(v.id)}">Mark Done</button>` : "Done"
      }
    ],
    rows: visits
  });
  container.querySelector("#token-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-done]");
    if (!btn) return;
    await db.update("op_visits", btn.dataset.done, { status: "Completed" });
    renderOpTokens(container);
  };
}

async function renderAppointments(container) {
  const [patients, appts, masters] = await Promise.all([db.list("patients"), db.list("appointments"), db.list("masters")]);
  const doctors = masters.filter((m) => m.catalog === "Service Providers");

  container.innerHTML = `
    <div class="module-header"><div><h2>OP Appointments &amp; PreBooking Scheduler</h2></div></div>
    <div class="card">
      <form id="appt-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="patientId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Doctor *</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Date *</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Time Slot</label><input name="time" type="time" value="10:30" required /></div>
        <div class="form-group form-span-2"><label>Reason / Notes</label><input name="notes" placeholder="Follow-up or PreBooking notes" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Book Appointment</button></div>
      </form>
    </div>
    <div class="card"><div id="appt-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#appt-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "status", label: "Status" }
    ],
    rows: appts,
    exportFileName: "appointments.csv"
  });
  container.querySelector("#appt-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    await db.add("appointments", {
      uhid: pat.uhid,
      patientName: pat.fullName,
      phone: pat.phone,
      doctorName: fd.get("doctorName"),
      date: fd.get("date"),
      time: fd.get("time"),
      notes: fd.get("notes"),
      status: "Confirmed"
    });
    toast("Appointment scheduled.", "success");
    renderAppointments(container);
  };
}

async function renderRelatedPatients(container) {
  const [patients, links] = await Promise.all([db.list("patients"), db.list("related_patients")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Related Patients &amp; Family Accounts</h2><p>Link family members or dependents under a primary account holder.</p></div></div>
    <div class="card">
      <form id="rel-form" class="form-grid">
        <div class="form-group"><label>Primary Patient</label><select name="primaryId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Dependent / Relative</label><select name="dependentId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Relationship</label><select name="relation"><option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option></select></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Link Family Account</button></div>
      </form>
    </div>
    <div class="card"><div id="rel-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#rel-tbl"), {
    columns: [
      { key: "primaryUhid", label: "Primary UHID" },
      { key: "primaryName", label: "Primary Name" },
      { key: "relation", label: "Relation" },
      { key: "dependentUhid", label: "Dependent UHID" },
      { key: "dependentName", label: "Dependent Name" }
    ],
    rows: links
  });
  container.querySelector("#rel-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p1 = patients.find((p) => p.id === fd.get("primaryId"));
    const p2 = patients.find((p) => p.id === fd.get("dependentId"));
    if (p1.id === p2.id) return toast("Select two different patients.", "warn");
    await db.add("related_patients", {
      primaryUhid: p1.uhid,
      primaryName: p1.fullName,
      dependentUhid: p2.uhid,
      dependentName: p2.fullName,
      relation: fd.get("relation")
    });
    toast("Family link saved.", "success");
    renderRelatedPatients(container);
  };
}

async function renderOpTestRx(container) {
  const [patients, tests] = await Promise.all([db.list("patients"), db.list("lab_tests")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Direct Reception Diagnostic Test Rx</h2><p>Order lab/scan investigations directly from front-office reception and queue to Lab &amp; Cashier.</p></div></div>
    <div class="card">
      <form id="testrx-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="patientId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Diagnostic Test *</label><select name="testId">${tests.map((t) => `<option value="${esc(t.id)}">${esc(t.category)}: ${esc(t.name)} (${money(t.price)})</option>`).join("")}</select></div>
        <div class="form-group"><label>Lab Routing</label><select name="source"><option>In-House</option><option>External</option></select></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Create Lab Order &amp; Cashier Bill</button></div>
      </form>
    </div>
  `;
  container.querySelector("#testrx-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    const test = tests.find((t) => t.id === fd.get("testId"));
    const labId = await db.nextSequence("LAB");
    await db.add("lab_orders", {
      id: labId,
      orderDate: todayISO(),
      uhid: pat.uhid,
      patientName: pat.fullName,
      category: test.category,
      testName: test.name,
      unit: test.unit,
      normalRange: test.normalRange,
      price: Number(test.price),
      source: fd.get("source"),
      status: "Pending",
      tatTargetHours: test.tatHours || 4
    });
    const billId = await db.nextSequence("INV");
    await db.add("cashier_bills", {
      id: billId,
      billDate: todayISO(),
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: "Reception Order",
      department: "Diagnostics",
      items: [{ desc: test.name, qty: 1, rate: Number(test.price), amount: Number(test.price) }],
      grossAmount: Number(test.price),
      discount: 0,
      netAmount: Number(test.price),
      paidAmount: 0,
      paymentMode: "Pending",
      status: "Pending",
      billedBy: auth.getCurrentUser().username
    });
    toast(`Lab Order ${labId} & Pending Cashier Bill ${billId} created.`, "success");
  };
}

async function renderCallLog(container) {
  const logs = await db.list("call_logs");
  container.innerHTML = `
    <div class="module-header"><div><h2>Reception Telephone Inquiry Call Log</h2></div></div>
    <div class="card">
      <form id="call-form" class="form-grid">
        <div class="form-group"><label>Call Type</label><select name="direction"><option>Incoming</option><option>Outgoing</option></select></div>
        <div class="form-group"><label>Caller / Patient Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Phone Number *</label><input name="phone" required /></div>
        <div class="form-group"><label>Summary / Action *</label><input name="summary" required placeholder="e.g. Enquired lab report readiness" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Save Call Log</button></div>
      </form>
    </div>
    <div class="card"><div id="call-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#call-tbl"), {
    columns: [
      { key: "date", label: "Time" },
      { key: "direction", label: "Direction" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "summary", label: "Notes" },
      { key: "loggedBy", label: "Staff" }
    ],
    rows: logs
  });
  container.querySelector("#call-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("call_logs", {
      date: new Date().toLocaleString(),
      direction: fd.get("direction"),
      name: fd.get("name"),
      phone: fd.get("phone"),
      summary: fd.get("summary"),
      loggedBy: auth.getCurrentUser().username
    });
    toast("Call log recorded.", "success");
    renderCallLog(container);
  };
}

async function renderIpAdmission(container) {
  const [patients, beds, masters] = await Promise.all([db.list("patients"), db.list("beds"), db.list("masters")]);
  const freeBeds = beds.filter((b) => b.status === "Available");
  const doctors = masters.filter((m) => m.catalog === "Service Providers");

  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient (IP) Admission Processing</h2><p>Allocate an available ward bed, assign admitting physician, and record advance deposit.</p></div></div>
    <div class="card">
      <form id="ip-adm-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="patientId" required>${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Available Bed *</label><select name="bedId" required>${freeBeds.map((b) => `<option value="${esc(b.id)}">${esc(b.ward)} / ${esc(b.roomNo)} (${money(b.dailyRate)}/day)</option>`).join("") || `<option value="">No beds available</option>`}</select></div>
        <div class="form-group"><label>Admitting Doctor</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Advance Deposit (₹)</label><input name="advancePaid" type="number" min="0" value="5000" /></div>
        <div class="form-group form-span-2"><label>Provisional Diagnosis *</label><input name="diagnosis" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary" ${freeBeds.length ? "" : "disabled"}>Admit Inpatient</button></div>
      </form>
    </div>
  `;

  container.querySelector("#ip-adm-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    const bed = beds.find((b) => b.id === fd.get("bedId"));
    if (!pat || !bed) return toast("Select valid patient & available bed.", "error");

    const ipId = await db.nextSequence("IP");
    const adv = Number(fd.get("advancePaid") || 0);

    await db.add("ip_admissions", {
      id: ipId,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      ward: bed.ward,
      roomNo: bed.roomNo,
      bedId: bed.id,
      admitDate: todayISO(),
      diagnosis: fd.get("diagnosis"),
      advancePaid: adv,
      serviceCharges: [{ date: todayISO(), desc: `Room Charge (${bed.roomNo})`, qty: 1, rate: bed.dailyRate, total: bed.dailyRate }],
      dietPlan: "Standard Hospital Diet",
      status: "Admitted"
    });
    await db.update("beds", bed.id, { status: "Occupied", housekeeping: "Occupied", patientUhid: pat.uhid, patientName: pat.fullName });
    if (adv > 0) {
      const cshId = await db.nextSequence("INV");
      await db.add("cashier_bills", {
        id: cshId,
        billDate: todayISO(),
        uhid: pat.uhid,
        patientName: pat.fullName,
        doctorName: fd.get("doctorName"),
        department: "IP Advance",
        items: [{ desc: `IP Admission Advance (${ipId})`, qty: 1, rate: adv, amount: adv }],
        grossAmount: adv,
        discount: 0,
        netAmount: adv,
        paidAmount: adv,
        paymentMode: "Cash",
        status: "Paid",
        billedBy: auth.getCurrentUser().username
      });
    }
    toast(`Patient admitted (${ipId}) in ${bed.roomNo}!`, "success");
    renderBedDashboard(container);
  };
}

async function renderBedDashboard(container) {
  const beds = await db.list("beds");
  container.innerHTML = `
    <div class="module-header"><div><h2>Live Ward &amp; Bed Occupancy Dashboard</h2><p>Monitor Available, Occupied, and Housekeeping beds in real time.</p></div></div>
    <div class="ward-grid">
      ${beds.map((b) => `
        <div class="bed-card ${esc(String(b.status || "Available").toLowerCase())}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${esc(b.roomNo)}</strong>
            <span class="badge ${b.status === "Available" ? "badge-green" : b.status === "Occupied" ? "badge-red" : "badge-amber"}">${esc(b.status)}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);margin:4px 0;">${esc(b.ward)} (${money(b.dailyRate)}/d)</div>
          <div style="font-size:12px;font-weight:600;">${b.patientName ? esc(b.patientName) : esc(b.housekeeping || "Ready")}</div>
          ${b.status === "Cleaning" ? `<button class="btn btn-sm btn-success" style="margin-top:8px;" data-clean="${esc(b.id)}">Mark Clean</button>` : ""}
        </div>
      `).join("")}
    </div>
  `;
  container.querySelector(".ward-grid").onclick = async (e) => {
    const btn = e.target.closest("button[data-clean]");
    if (!btn) return;
    await db.update("beds", btn.dataset.clean, { status: "Available", housekeeping: "Clean" });
    toast("Bed marked clean and available.", "success");
    renderBedDashboard(container);
  };
}

async function renderRoomManagement(container, params) {
  const beds = await db.list("beds");
  container.innerHTML = `
    <div class="module-header"><div><h2>Room &amp; Ward Management (${esc(params.mode || "wards")})</h2></div></div>
    <div class="card">
      <form id="add-room-form" class="form-grid">
        <div class="form-group"><label>Ward Name *</label><input name="ward" required placeholder="e.g. Deluxe Suite" /></div>
        <div class="form-group"><label>Room / Bed No *</label><input name="roomNo" required placeholder="e.g. DLX-01" /></div>
        <div class="form-group"><label>Category</label><select name="category"><option>General</option><option>Semi-Private</option><option>Private AC</option><option>Critical Care</option></select></div>
        <div class="form-group"><label>Daily Rate (₹)</label><input name="dailyRate" type="number" value="2500" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">+ Add Bed / Room</button></div>
      </form>
    </div>
    <div class="card"><div id="rm-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#rm-tbl"), {
    columns: [
      { key: "ward", label: "Ward" },
      { key: "roomNo", label: "Room No" },
      { key: "category", label: "Category" },
      { key: "dailyRate", label: "Rate/Day", render: (r) => money(r.dailyRate) },
      { key: "status", label: "Status" },
      { key: "housekeeping", label: "Housekeeping" },
      {
        key: "act",
        label: "Toggle",
        noExport: true,
        render: (r) => r.status !== "Occupied" ? `<button class="btn btn-sm" data-hk="${esc(r.id)}">Toggle Clean/Sanitize</button>` : "In Use"
      }
    ],
    rows: beds
  });
  container.querySelector("#add-room-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("beds", {
      ward: fd.get("ward"),
      roomNo: fd.get("roomNo"),
      category: fd.get("category"),
      dailyRate: Number(fd.get("dailyRate")),
      status: "Available",
      housekeeping: "Clean",
      patientUhid: "",
      patientName: ""
    });
    toast("Room added.", "success");
    renderRoomManagement(container, params);
  };
  container.querySelector("#rm-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-hk]");
    if (!btn) return;
    const rm = beds.find((b) => b.id === btn.dataset.hk);
    const next = rm.status === "Available" ? "Cleaning" : "Available";
    await db.update("beds", rm.id, { status: next, housekeeping: next === "Available" ? "Clean" : "Sanitizing" });
    renderRoomManagement(container, params);
  };
}

async function renderIpEdit(container) {
  const ips = await db.list("ip_admissions");
  container.innerHTML = `
    <div class="module-header"><div><h2>Edit Inpatient Admissions</h2></div></div>
    <div class="card"><div id="ip-edit-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ip-edit-tbl"), {
    columns: [
      { key: "id", label: "IP ID" },
      { key: "admitDate", label: "Admit Date" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Room" },
      { key: "doctorName", label: "Doctor" },
      { key: "diagnosis", label: "Diagnosis" },
      { key: "status", label: "Status" }
    ],
    rows: ips
  });
}

async function renderIpServiceLog(container, isMisc) {
  const ips = (await db.list("ip_admissions")).filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>${isMisc ? "Inpatient Miscellaneous Charges" : "Inpatient Bedside Nursing &amp; Service Log"}</h2></div></div>
    <div class="card">
      <form id="ip-srv-form" class="form-grid">
        <div class="form-group"><label>Admitted Patient *</label><select name="ipId" required>${ips.map((i) => `<option value="${esc(i.id)}">${esc(i.id)} — ${esc(i.patientName)} (${esc(i.roomNo)})</option>`).join("") || `<option value="">No active inpatients</option>`}</select></div>
        <div class="form-group"><label>Service / Consumable Description *</label><input name="desc" required placeholder="${isMisc ? "e.g. Attender Cot / Oxygen Cylinder" : "e.g. Nebulization / Dressing / Nursing"}" /></div>
        <div class="form-group"><label>Qty</label><input name="qty" type="number" min="1" value="1" required /></div>
        <div class="form-group"><label>Unit Rate (₹)</label><input name="rate" type="number" min="1" value="350" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary" ${ips.length ? "" : "disabled"}>Post IP Charge</button></div>
      </form>
    </div>
  `;
  container.querySelector("#ip-srv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ip = ips.find((i) => i.id === fd.get("ipId"));
    if (!ip) return;
    const qty = Number(fd.get("qty"));
    const rate = Number(fd.get("rate"));
    const currentCharges = ip.serviceCharges || ip.charges || [];
    const nextCharges = [...currentCharges, { date: todayISO(), desc: fd.get("desc"), qty, rate, total: qty * rate }];
    await db.update("ip_admissions", ip.id, { serviceCharges: nextCharges });
    toast("Service charge added to inpatient ledger.", "success");
    renderIpServiceLog(container, isMisc);
  };
}

async function renderIpDischarge(container) {
  const [ips, beds] = await Promise.all([db.list("ip_admissions"), db.list("beds")]);
  const active = ips.filter((i) => i.status === "Admitted");

  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient Clinical &amp; Financial Discharge</h2><p>Settle final IP bill, release bed to housekeeping, and print discharge summary.</p></div></div>
    <div class="card"><div id="ip-dis-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ip-dis-tbl"), {
    columns: [
      { key: "id", label: "IP ID" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Room" },
      { key: "advancePaid", label: "Advance", render: (i) => money(i.advancePaid) },
      { key: "status", label: "Status" },
      {
        key: "act",
        label: "Discharge",
        noExport: true,
        render: (i) => i.status === "Admitted" ? `<button class="btn btn-sm btn-danger" data-dis="${esc(i.id)}">Discharge &amp; Settle</button>` : `Discharged (${esc(i.dischargeDate || "")})`
      }
    ],
    rows: active.length ? active : ips
  });

  container.querySelector("#ip-dis-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-dis]");
    if (!btn) return;
    const ip = ips.find((i) => i.id === btn.dataset.dis);
    const charges = ip.serviceCharges || ip.charges || [];
    const totalCharges = charges.reduce((s, c) => s + Number(c.total || 0), 0);
    const balance = Math.max(0, totalCharges - Number(ip.advancePaid || 0));

    openModal({
      title: `Discharge Settlement: ${ip.patientName} (${ip.id})`,
      bodyHtml: `
        <div class="alert alert-info">
          Total Billed Services: <strong>${money(totalCharges)}</strong> | Advance Paid: <strong>${money(ip.advancePaid)}</strong> | Net Balance Due: <strong>${money(balance)}</strong>
        </div>
        <form id="dis-form" class="form-grid">
          <div class="form-group"><label>Condition at Discharge</label><select name="condition"><option>Stable &amp; Improved</option><option>Recovered</option><option>Referred Higher Center</option></select></div>
          <div class="form-group"><label>Final Settlement Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Insurance TPA</option></select></div>
          <div class="form-group form-span-2"><label>Discharge Summary &amp; Medications Advice</label><textarea name="advice" rows="3" required>Continue prescribed oral medications. Review in OPD after 5 days.</textarea></div>
          <div class="form-actions"><button type="submit" class="btn btn-danger">Complete Discharge &amp; Print Summary</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#dis-form").onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          await db.update("ip_admissions", ip.id, {
            status: "Discharged",
            dischargeDate: todayISO(),
            dischargeCondition: fd.get("condition"),
            dischargeAdvice: fd.get("advice")
          });
          const bed = beds.find((b) => b.roomNo === ip.roomNo);
          if (bed) {
            await db.update("beds", bed.id, { status: "Cleaning", housekeeping: "Sanitizing", patientUhid: "", patientName: "" });
          }
          if (balance > 0) {
            const billId = await db.nextSequence("INV");
            await db.add("cashier_bills", {
              id: billId,
              billDate: todayISO(),
              uhid: ip.uhid,
              patientName: ip.patientName,
              doctorName: ip.doctorName,
              department: "IP Discharge",
              items: charges.map((c) => ({ desc: c.desc, qty: c.qty, rate: c.rate, amount: c.total })),
              grossAmount: totalCharges,
              discount: Number(ip.advancePaid || 0),
              netAmount: balance,
              paidAmount: balance,
              paymentMode: fd.get("paymentMode"),
              status: "Paid",
              billedBy: auth.getCurrentUser().username
            });
          }
          toast(`Inpatient ${ip.id} discharged and room sent to housekeeping.`, "success");
          closeModal();
          await printA4Document({
            docTitle: "IP Discharge Summary",
            metaPairs: [["IP No", ip.id], ["UHID", ip.uhid], ["Patient", ip.patientName], ["Admit Date", ip.admitDate], ["Discharge Date", todayISO()], ["Doctor", ip.doctorName]],
            bodyHtml: `<p><strong>Diagnosis:</strong> ${esc(ip.diagnosis)}</p><p><strong>Condition at Discharge:</strong> ${esc(fd.get("condition"))}</p><p><strong>Advice:</strong> ${esc(fd.get("advice"))}</p>`,
            signatureLabel: ip.doctorName
          });
          renderIpDischarge(container);
        };
      }
    });
  };
}

async function renderTestEnquiry(container) {
  const tests = await db.list("lab_tests");
  container.innerHTML = `
    <div class="module-header"><div><h2>Diagnostic Test Pricing &amp; Turnaround Enquiry</h2></div></div>
    <div class="card"><div id="enq-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#enq-tbl"), {
    columns: [
      { key: "code", label: "Code" },
      { key: "category", label: "Category" },
      { key: "name", label: "Investigation Name" },
      { key: "price", label: "Tariff", render: (t) => money(t.price) },
      { key: "tatHours", label: "Est. TAT", render: (t) => `${t.tatHours || 4} hrs` },
      { key: "normalRange", label: "Reference Range" }
    ],
    rows: tests
  });
}

async function renderAlertsQueue(container, scope) {
  const [patients, appts] = await Promise.all([db.list("patients"), db.list("appointments")]);
  const rows = scope === "Doctors"
    ? appts.map((a) => ({ name: a.doctorName, phone: "", detail: `OP Appt: ${a.patientName} at ${a.time}` }))
    : patients.map((p) => ({ name: p.fullName, phone: p.phone, detail: scope === "Vaccination" ? "Immunization Booster Due Check" : `UHID ${p.uhid}` }));

  container.innerHTML = `
    <div class="module-header"><div><h2>${esc(scope)} Alert &amp; Reminder Queue</h2></div></div>
    <div class="card"><div id="alert-q-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#alert-q-tbl"), {
    columns: [
      { key: "name", label: "Recipient" },
      { key: "phone", label: "Mobile" },
      { key: "detail", label: "Alert Context" },
      { key: "act", label: "Send", noExport: true, render: (r, idx) => r.phone ? `<button class="btn btn-sm btn-success" data-send="${esc(r.name)}|${esc(r.phone)}|${esc(r.detail)}">Send WhatsApp</button>` : "-" }
    ],
    rows
  });
  container.querySelector("#alert-q-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-send]");
    if (!btn) return;
    const [name, phone, detail] = btn.dataset.send.split("|");
    const res = await queueOrSendNotification({
      recipientName: name,
      phone,
      channel: "WhatsApp",
      category: scope,
      message: `Hello ${name}, Reminder from See Curavite Hospital Management: ${detail}.`
    });
    toast("Alert logged in SMS/WhatsApp queue.", "success");
    if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
  };
}

async function renderSendSms(container) {
  const logs = await db.list("notifications_log");
  container.innerHTML = `
    <div class="module-header"><div><h2>Send SMS / WhatsApp Notification</h2><p>Send instant appointment, lab readiness, or pharmacy alerts.</p></div></div>
    <div class="card">
      <form id="sms-send-form" class="form-grid">
        <div class="form-group"><label>Recipient Name *</label><input name="recipientName" required /></div>
        <div class="form-group"><label>Mobile Number *</label><input name="phone" required placeholder="10-digit mobile" /></div>
        <div class="form-group"><label>Channel</label><select name="channel"><option>SMS</option><option>WhatsApp</option></select></div>
        <div class="form-group"><label>Category</label><select name="category"><option>Appointment</option><option>Lab Ready</option><option>Pharmacy Refill</option><option>Vaccination</option></select></div>
        <div class="form-group form-span-2"><label>Message Text *</label><textarea name="message" rows="2" required>Dear Patient, your consultation/report update from See Curavite Hospital Management is ready.</textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-success">Dispatch Notification</button></div>
      </form>
    </div>
    <div class="card"><div id="sms-log-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#sms-log-tbl"), {
    columns: [
      { key: "sentAt", label: "Time", render: (r) => esc(String(r.sentAt || "").slice(0, 16).replace("T", " ")) },
      { key: "recipientName", label: "Recipient" },
      { key: "phone", label: "Mobile" },
      { key: "channel", label: "Channel" },
      { key: "message", label: "Message" },
      { key: "status", label: "Status" }
    ],
    rows: logs
  });
  container.querySelector("#sms-send-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await queueOrSendNotification({
      recipientName: fd.get("recipientName"),
      phone: fd.get("phone"),
      channel: fd.get("channel"),
      category: fd.get("category"),
      message: fd.get("message")
    });
    toast("Notification dispatched & logged.", "success");
    if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
    renderSendSms(container);
  };
}

async function renderDutyAllotment(container, roleType) {
  const roster = await db.list("duty_roster");
  container.innerHTML = `
    <div class="module-header"><div><h2>Duty Allotment Roster (${esc(roleType)})</h2></div></div>
    <div class="card">
      <form id="duty-form" class="form-grid">
        <div class="form-group"><label>Staff / Doctor Name *</label><input name="staffName" required /></div>
        <div class="form-group"><label>Role</label><select name="role"><option ${roleType === "Doctor" ? "selected" : ""}>Doctor</option><option ${roleType === "Nurse" ? "selected" : ""}>Nurse</option><option>Duty Swap</option></select></div>
        <div class="form-group"><label>Shift</label><select name="shift"><option>Morning (8 AM - 2 PM)</option><option>Evening (2 PM - 8 PM)</option><option>Night (8 PM - 8 AM)</option></select></div>
        <div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Ward / OPD Unit</label><input name="unit" value="General OPD" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Assign Shift</button></div>
      </form>
    </div>
    <div class="card"><div id="duty-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#duty-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "staffName", label: "Staff / Doctor" },
      { key: "role", label: "Role" },
      { key: "shift", label: "Shift" },
      { key: "unit", label: "Unit" }
    ],
    rows: roster
  });
  container.querySelector("#duty-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("duty_roster", {
      date: fd.get("date"),
      staffName: fd.get("staffName"),
      role: fd.get("role"),
      shift: fd.get("shift"),
      unit: fd.get("unit")
    });
    toast("Duty shift allotted.", "success");
    renderDutyAllotment(container, roleType);
  };
}
