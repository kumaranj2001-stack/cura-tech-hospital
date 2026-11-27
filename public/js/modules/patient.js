/**
 * Patient Front-Office, OP Reception, IP Reception, IP Services, Alerts & Duty Allotment
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, openModal, closeModal, toast } from "../ui.js";
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
  const patients = await db.list("patients");
  container.innerHTML = `
    <div class="module-header">
      <div><h2>New Patient Registration</h2><p>Register patient demographics, generate UHID &amp; barcode, emergency contacts, and insurance.</p></div>
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
          <div class="form-group"><label>Policy / Member ID</label><input name="policyNumber" placeholder="Optional" /></div>
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
    const uhid = await db.nextSequence("CTH");
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
      policyNumber: fd.get("policyNumber"),
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
    <div class="module-header"><div><h2>Edit &amp; Search Patient Directory</h2><p>Update demographic records, phone numbers, allergies, and insurance details.</p></div></div>
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
      { key: "allergies", label: "Allergies" },
      {
        key: "act",
        label: "Edit",
        noExport: true,
        render: (p) => `<button class="btn btn-sm btn-primary" data-edit="${esc(p.id)}">Edit</button>`
      }
    ],
    rows: patients,
    searchPlaceholder: "Search patient by UHID, phone, name...",
    exportFileName: "patients-directory.csv",
    printTitle: "Patient Directory"
  });

  container.querySelector("#edit-pat-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-edit]");
    if (!btn) return;
    const p = patients.find((x) => x.id === btn.dataset.edit);
    if (!p) return;
    openModal({
      title: `Edit Patient: ${p.uhid}`,
      bodyHtml: `
        <form id="edit-pat-form" class="form-grid">
          <div class="form-group"><label>Full Name</label><input name="fullName" value="${esc(p.fullName)}" required /></div>
          <div class="form-group"><label>Age</label><input name="age" type="number" value="${esc(p.age)}" required /></div>
          <div class="form-group"><label>Phone</label><input name="phone" value="${esc(p.phone)}" required /></div>
          <div class="form-group"><label>City</label><input name="city" value="${esc(p.city || "")}" /></div>
          <div class="form-group form-span-2"><label>Address</label><input name="address" value="${esc(p.address || "")}" /></div>
          <div class="form-group"><label>Insurance</label><input name="insuranceProvider" value="${esc(p.insuranceProvider || "")}" /></div>
          <div class="form-group"><label>Allergies</label><input name="allergies" value="${esc(p.allergies || "")}" /></div>
          <div class="form-actions form-span-2"><button type="submit" class="btn btn-primary">Save Changes</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#edit-pat-form").onsubmit = async (ev) => {
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
  const [patients, doctors, visits] = await Promise.all([
    db.list("patients"),
    db.list("doctors"),
    db.list("op_visits")
  ]);
  const today = todayISO();
  const todayVisits = visits.filter((v) => v.visitDate === today);

  container.innerHTML = `
    <div class="module-header">
      <div><h2>Outpatient (OP) Reception &amp; Visit Registration</h2><p>Issue OP tokens, assign consulting doctors, and generate consultation bills automatically.</p></div>
    </div>
    <div class="card">
      <form id="op-reg-form" class="form-grid">
        <div class="form-group">
          <label>Select Patient *</label>
          <select name="patientId" required>
            <option value="">-- Choose Patient --</option>
            ${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)} (${esc(p.phone)})</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Consulting Doctor *</label>
          <select name="doctorId" id="op-doc-sel" required>
            ${doctors.map((d) => `<option value="${esc(d.id)}" data-fee="${d.fee}">${esc(d.name)} (${esc(d.specialisation)} — ₹${d.fee})</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Visit Type</label>
          <select name="visitType"><option>New OP</option><option>Follow-Up</option><option>Emergency</option><option>PreBooking</option></select>
        </div>
        <div class="form-group">
          <label>Consultation Fee (₹)</label>
          <input name="fee" id="op-fee-input" type="number" value="${doctors[0]?.fee || 400}" required />
        </div>
        <div class="form-group">
          <label>Payment Mode</label>
          <select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Pending (Pay at Cashier)</option></select>
        </div>
        <div class="form-actions" style="align-self:end;">
          <button type="submit" class="btn btn-primary">Generate Token &amp; Register OP</button>
        </div>
      </form>
    </div>
    <div class="card">
      <h3 class="card-title">Today's OP Visits (${todayVisits.length})</h3>
      <div id="op-visits-tbl"></div>
    </div>
  `;

  const docSel = container.querySelector("#op-doc-sel");
  const feeInp = container.querySelector("#op-fee-input");
  docSel.onchange = () => {
    const opt = docSel.selectedOptions[0];
    if (opt) feeInp.value = opt.dataset.fee || 400;
  };

  mountDataTable(container.querySelector("#op-visits-tbl"), {
    columns: [
      { key: "tokenNo", label: "Token #", render: (v) => `<span class="badge badge-blue">#${v.tokenNo}</span>` },
      { key: "id", label: "Visit ID" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "visitType", label: "Type" },
      { key: "fee", label: "Fee", render: (v) => money(v.fee) },
      { key: "status", label: "Clinical Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : "badge-amber"}">${esc(v.status)}</span>` },
      { key: "paymentStatus", label: "Payment", render: (v) => `<span class="badge ${v.paymentStatus === "Paid" ? "badge-green" : "badge-red"}">${esc(v.paymentStatus)}</span>` },
      {
        key: "act",
        label: "Token Slip",
        noExport: true,
        render: (v) => `<button class="btn btn-sm" data-slip="${esc(v.id)}">Print Slip</button>`
      }
    ],
    rows: todayVisits,
    searchPlaceholder: "Search token, UHID, patient..."
  });

  container.querySelector("#op-visits-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-slip]");
    if (!btn) return;
    const v = todayVisits.find((x) => x.id === btn.dataset.slip);
    if (!v) return;
    await printThermalBill({
      title: `OP TOKEN #${v.tokenNo}`,
      billNo: v.id,
      billDate: v.visitDate,
      patientName: v.patientName,
      uhid: v.uhid,
      items: [{ desc: `OP Consultation - ${v.doctorName}`, qty: 1, amount: v.fee }],
      subTotal: v.fee,
      netTotal: v.fee,
      paymentMode: v.paymentStatus,
      cashier: auth.getCurrentUser().username
    });
  };

  container.querySelector("#op-reg-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    const doc = doctors.find((d) => d.id === fd.get("doctorId"));
    const fee = Number(fd.get("fee"));
    const payMode = fd.get("paymentMode");
    const isPending = payMode.startsWith("Pending");
    const tokenNo = todayVisits.length + 1;
    const visitId = await db.nextSequence("OP");

    await db.add("op_visits", {
      id: visitId,
      tokenNo,
      visitDate: today,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorId: doc.id,
      doctorName: doc.name,
      visitType: fd.get("visitType"),
      fee,
      status: "Waiting",
      paymentStatus: isPending ? "Pending" : "Paid"
    });

    const billNo = await db.nextSequence("CSH");
    await db.add("cashier_bills", {
      id: billNo,
      billDate: today,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: doc.name,
      department: fd.get("visitType") === "Emergency" ? "Emergency" : fd.get("visitType") === "PreBooking" ? "PreBooking" : "OP Consultation",
      items: [{ desc: `OP Consultation (${doc.name})`, qty: 1, rate: fee, amount: fee }],
      grossAmount: fee,
      discount: 0,
      netAmount: fee,
      paidAmount: isPending ? 0 : fee,
      paymentMode: isPending ? "Pending" : payMode,
      status: isPending ? "Pending" : "Paid",
      billedBy: auth.getCurrentUser().username
    });

    toast(`OP Token #${tokenNo} generated for ${pat.fullName}!`, "success");
    renderOpRegistration(container);
  };
}

async function renderOpTokens(container) {
  const visits = (await db.list("op_visits")).filter((v) => v.visitDate === todayISO());
  container.innerHTML = `
    <div class="module-header"><div><h2>Live OP Token Queue Display</h2><p>Real-time token status across consulting doctors.</p></div></div>
    <div class="ward-grid">
      ${visits.map((v) => `
        <div class="bed-card ${v.status === "Completed" ? "available" : v.status === "Prescreened" ? "cleaning" : "occupied"}">
          <div style="font-size:20px;font-weight:800;">Token #${v.tokenNo}</div>
          <div style="font-weight:700;margin-top:4px;">${esc(v.patientName)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);">${esc(v.uhid)}</div>
          <div style="margin-top:6px;font-size:12px;">${esc(v.doctorName)}</div>
          <div style="margin-top:6px;"><span class="badge badge-blue">${esc(v.status)}</span></div>
        </div>
      `).join("") || `<div class="alert alert-info">No OP tokens generated today yet.</div>`}
    </div>
  `;
}

async function renderAppointments(container) {
  const [appts, patients, doctors] = await Promise.all([db.list("appointments"), db.list("patients"), db.list("doctors")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Appointments &amp; Review Booking</h2><p>Book, reschedule, and track upcoming outpatient appointments.</p></div></div>
    <div class="card">
      <form id="appt-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="uhid" required>${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Doctor *</label><select name="doctorName" required>${doctors.map((d) => `<option value="${esc(d.name)}">${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Appointment Date *</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Time Slot</label><input name="slot" type="time" value="10:30" /></div>
        <div class="form-group"><label>Reason / Notes</label><input name="notes" placeholder="Review / Follow-up" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Book Appointment</button></div>
      </form>
    </div>
    <div class="card"><div id="appt-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#appt-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "slot", label: "Slot" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "notes", label: "Notes" },
      { key: "status", label: "Status", render: (a) => `<span class="badge ${a.status === "Completed" ? "badge-green" : "badge-blue"}">${esc(a.status)}</span>` }
    ],
    rows: appts,
    exportFileName: "appointments.csv"
  });
  container.querySelector("#appt-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    await db.add("appointments", {
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      date: fd.get("date"),
      slot: fd.get("slot"),
      notes: fd.get("notes"),
      status: "Scheduled"
    });
    toast("Appointment scheduled.", "success");
    renderAppointments(container);
  };
}

async function renderRelatedPatients(container) {
  const [patients, links] = await Promise.all([db.list("patients"), db.list("related_patients")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Related Patients &amp; Family Account Linking</h2><p>Link family members or dependents under a primary hospital account.</p></div></div>
    <div class="card">
      <form id="rel-form" class="form-grid">
        <div class="form-group"><label>Primary Patient</label><select name="primaryUhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Dependent Patient</label><select name="dependentUhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Relationship</label><select name="relation"><option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option></select></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Link Family Member</button></div>
      </form>
    </div>
    <div class="card"><div id="rel-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#rel-tbl"), {
    columns: [
      { key: "primaryUhid", label: "Primary UHID" },
      { key: "primaryName", label: "Primary Account" },
      { key: "dependentUhid", label: "Dependent UHID" },
      { key: "dependentName", label: "Dependent Name" },
      { key: "relation", label: "Relationship" }
    ],
    rows: links
  });
  container.querySelector("#rel-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p1 = patients.find((p) => p.uhid === fd.get("primaryUhid"));
    const p2 = patients.find((p) => p.uhid === fd.get("dependentUhid"));
    await db.add("related_patients", {
      primaryUhid: p1.uhid,
      primaryName: p1.fullName,
      dependentUhid: p2.uhid,
      dependentName: p2.fullName,
      relation: fd.get("relation")
    });
    toast("Family account linked.", "success");
    renderRelatedPatients(container);
  };
}

async function renderOpTestRx(container) {
  const [patients, tests, doctors] = await Promise.all([db.list("patients"), db.list("lab_tests_master"), db.list("doctors")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>OP Reception — Direct Diagnostic Test Prescription</h2><p>Order lab, X-ray, or scan tests from front office and push straight to Lab &amp; Cashier queues.</p></div></div>
    <div class="card">
      <form id="op-test-rx-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="uhid" required>${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Diagnostic Test *</label><select name="testId" required>${tests.map((t) => `<option value="${esc(t.id)}">[${esc(t.category)}] ${esc(t.name)} — ₹${t.price}</option>`).join("")}</select></div>
        <div class="form-group"><label>Referring Doctor</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Lab Source</label><select name="source"><option>Internal</option><option>External</option></select></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Order Diagnostic Test</button></div>
      </form>
    </div>
  `;
  container.querySelector("#op-test-rx-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    const tst = tests.find((t) => t.id === fd.get("testId"));
    const labId = await db.nextSequence("LAB");
    await db.add("lab_orders", {
      id: labId,
      orderDate: todayISO(),
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      category: tst.category,
      testName: tst.name,
      price: tst.price,
      source: fd.get("source"),
      status: "Pending",
      unit: tst.unit,
      normalRange: tst.normalRange,
      resultValue: ""
    });
    const billId = await db.nextSequence("CSH");
    await db.add("cashier_bills", {
      id: billId,
      billDate: todayISO(),
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      department: "Diagnostics",
      items: [{ desc: tst.name, qty: 1, rate: tst.price, amount: tst.price }],
      grossAmount: tst.price,
      discount: 0,
      netAmount: tst.price,
      paidAmount: 0,
      paymentMode: "Pending",
      status: "Pending",
      billedBy: auth.getCurrentUser().username
    });
    toast(`Lab Order ${labId} & Cashier Bill ${billId} created!`, "success");
  };
}

async function renderCallLog(container) {
  const logs = await db.list("call_logs");
  container.innerHTML = `
    <div class="module-header"><div><h2>Patient Telephone Call Log</h2><p>Track incoming and outgoing patient inquiries and appointment callbacks.</p></div></div>
    <div class="card">
      <form id="call-form" class="form-grid">
        <div class="form-group"><label>Caller / Patient Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Phone *</label><input name="phone" required /></div>
        <div class="form-group"><label>Direction</label><select name="direction"><option>Incoming</option><option>Outgoing</option></select></div>
        <div class="form-group"><label>Summary / Inquiry *</label><input name="summary" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Log Call</button></div>
      </form>
    </div>
    <div class="card"><div id="call-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#call-tbl"), {
    columns: [
      { key: "date", label: "Date/Time" },
      { key: "direction", label: "Direction" },
      { key: "name", label: "Caller" },
      { key: "phone", label: "Phone" },
      { key: "summary", label: "Notes" },
      { key: "staff", label: "Logged By" }
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
      staff: auth.getCurrentUser().username
    });
    toast("Call log recorded.", "success");
    renderCallLog(container);
  };
}

async function renderIpAdmission(container) {
  const [patients, doctors, rooms] = await Promise.all([db.list("patients"), db.list("doctors"), db.list("rooms")]);
  const freeBeds = rooms.filter((r) => r.status === "Available");

  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient (IP) Admission Processing</h2><p>Admit patients to available beds, record initial diagnosis, diet plan, and advance deposit.</p></div></div>
    <div class="card">
      <form id="ip-admit-form" class="form-grid">
        <div class="form-group"><label>Patient *</label><select name="uhid" required>${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Admitting Doctor *</label><select name="doctorName" required>${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Available Bed / Ward *</label><select name="roomId" required>${freeBeds.map((r) => `<option value="${esc(r.id)}">${esc(r.ward)} — ${esc(r.roomNo)} (₹${r.ratePerDay}/day)</option>`).join("") || `<option value="">No free beds available</option>`}</select></div>
        <div class="form-group"><label>Advance Deposit (₹)</label><input name="advancePaid" type="number" value="5000" min="0" /></div>
        <div class="form-group form-span-2"><label>Provisional Diagnosis</label><input name="diagnosis" required placeholder="Clinical reason for admission" /></div>
        <div class="form-group"><label>Initial Therapeutic Diet</label><input name="diet" value="Normal Hospital Diet" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary" ${freeBeds.length ? "" : "disabled"}>Admit Inpatient</button></div>
      </form>
    </div>
  `;

  container.querySelector("#ip-admit-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    const bed = rooms.find((r) => r.id === fd.get("roomId"));
    if (!bed) return toast("Select an available bed.", "error");
    const ipId = await db.nextSequence("IP");
    const adv = Number(fd.get("advancePaid") || 0);

    await db.add("ip_admissions", {
      id: ipId,
      uhid: pat.uhid,
      patientName: pat.fullName,
      doctorName: fd.get("doctorName"),
      ward: bed.ward,
      roomNo: bed.roomNo,
      admitDate: todayISO(),
      diagnosis: fd.get("diagnosis"),
      diet: fd.get("diet"),
      advancePaid: adv,
      status: "Admitted",
      charges: [{ date: todayISO(), item: `Bed Charges (${bed.roomNo})`, qty: 1, rate: bed.ratePerDay, amount: bed.ratePerDay }]
    });

    await db.update("rooms", bed.id, { status: "Occupied", patientUhid: pat.uhid, patientName: pat.fullName });
    if (adv > 0) {
      const cshId = await db.nextSequence("CSH");
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
  const rooms = await db.list("rooms");
  const occupied = rooms.filter((r) => r.status === "Occupied").length;
  const available = rooms.filter((r) => r.status === "Available").length;
  const cleaning = rooms.filter((r) => r.status === "Cleaning").length;

  container.innerHTML = `
    <div class="module-header"><div><h2>Real-Time Ward &amp; Bed Occupancy Dashboard</h2><p>Live status of General Wards, Semi-Private, Private Suites &amp; ICU beds.</p></div></div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Beds</div><div class="kpi-value">${rooms.length}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Available</div><div class="kpi-value">${available}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Occupied</div><div class="kpi-value">${occupied}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Cleaning / Housekeeping</div><div class="kpi-value">${cleaning}</div></div>
    </div>
    <div class="ward-grid">
      ${rooms.map((r) => `
        <div class="bed-card ${r.status.toLowerCase()}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${esc(r.roomNo)}</strong>
            <span class="badge ${r.status === "Available" ? "badge-green" : r.status === "Occupied" ? "badge-red" : "badge-amber"}">${esc(r.status)}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">${esc(r.ward)} (${money(r.ratePerDay)}/day)</div>
          <div style="margin-top:8px;font-weight:600;font-size:12px;">${r.patientName ? esc(r.patientName) : "Ready for Admission"}</div>
          <div style="font-size:11px;color:var(--text-muted);">${esc(r.patientUhid || "")}</div>
          ${r.status === "Cleaning" ? `<button class="btn btn-sm btn-success" style="margin-top:8px;" data-clean="${esc(r.id)}">Mark Clean &amp; Available</button>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  container.onclick = async (e) => {
    const btn = e.target.closest("button[data-clean]");
    if (!btn) return;
    await db.update("rooms", btn.dataset.clean, { status: "Available", housekeeping: "Clean" });
    toast("Bed marked clean and available.", "success");
    renderBedDashboard(container);
  };
}

async function renderRoomManagement(container, params) {
  const rooms = await db.list("rooms");
  container.innerHTML = `
    <div class="module-header"><div><h2>Room &amp; Ward Management (${esc(params.mode || "All")})</h2><p>Manage room categories, daily tariffs, bed transfers, and housekeeping states.</p></div></div>
    <div class="card">
      <form id="add-room-form" class="form-grid">
        <div class="form-group"><label>Ward Name *</label><input name="ward" required placeholder="e.g. Deluxe Ward" /></div>
        <div class="form-group"><label>Room / Bed No *</label><input name="roomNo" required placeholder="e.g. DLX-101" /></div>
        <div class="form-group"><label>Category</label><select name="category"><option>General</option><option>Semi-Private</option><option>Private</option><option>ICU</option></select></div>
        <div class="form-group"><label>Tariff / Day (₹)</label><input name="ratePerDay" type="number" value="1500" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add Bed / Room</button></div>
      </form>
    </div>
    <div class="card"><div id="room-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#room-tbl"), {
    columns: [
      { key: "roomNo", label: "Bed No" },
      { key: "ward", label: "Ward" },
      { key: "category", label: "Category" },
      { key: "ratePerDay", label: "Rate/Day", render: (r) => money(r.ratePerDay) },
      { key: "status", label: "Status" },
      { key: "housekeeping", label: "Housekeeping" },
      { key: "patientName", label: "Current Patient" },
      {
        key: "act",
        label: "Update Status",
        noExport: true,
        render: (r) => r.status !== "Occupied"
          ? `<button class="btn btn-sm" data-toggle="${esc(r.id)}">${r.status === "Available" ? "Set Cleaning" : "Set Available"}</button>`
          : "Occupied"
      }
    ],
    rows: rooms
  });
  container.querySelector("#add-room-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("rooms", {
      ward: fd.get("ward"),
      roomNo: fd.get("roomNo"),
      category: fd.get("category"),
      ratePerDay: Number(fd.get("ratePerDay")),
      status: "Available",
      housekeeping: "Clean",
      patientUhid: "",
      patientName: ""
    });
    toast("New room/bed added.", "success");
    renderRoomManagement(container, params);
  };
  container.querySelector("#room-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-toggle]");
    if (!btn) return;
    const rm = rooms.find((r) => r.id === btn.dataset.toggle);
    const next = rm.status === "Available" ? "Cleaning" : "Available";
    await db.update("rooms", rm.id, { status: next, housekeeping: next === "Available" ? "Clean" : "Sanitizing" });
    renderRoomManagement(container, params);
  };
}

async function renderIpEdit(container) {
  const ips = await db.list("ip_admissions");
  container.innerHTML = `
    <div class="module-header"><div><h2>Edit Inpatient Admissions</h2><p>View and update active or discharged inpatient details.</p></div></div>
    <div class="card"><div id="ip-edit-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ip-edit-tbl"), {
    columns: [
      { key: "id", label: "IP No" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Room/Bed" },
      { key: "doctorName", label: "Doctor" },
      { key: "admitDate", label: "Admit Date" },
      { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "Admitted" ? "badge-blue" : "badge-green"}">${esc(r.status)}</span>` }
    ],
    rows: ips
  });
}

async function renderIpServiceLog(container, isMisc) {
  const ips = (await db.list("ip_admissions")).filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>${isMisc ? "IP Miscellaneous Services" : "Inpatient Service & Procedure Log"}</h2><p>Record bedside nursing, consumables, procedures, and daily room charges.</p></div></div>
    <div class="card">
      <form id="ip-srv-form" class="form-grid">
        <div class="form-group"><label>Active Inpatient *</label><select name="ipId" required>${ips.map((i) => `<option value="${esc(i.id)}">${esc(i.id)} — ${esc(i.patientName)} (${esc(i.roomNo)})</option>`).join("") || `<option value="">No active inpatients</option>`}</select></div>
        <div class="form-group"><label>Service / Consumable Item *</label><input name="item" required placeholder="e.g. IV Cannula + Nursing Care" /></div>
        <div class="form-group"><label>Qty</label><input name="qty" type="number" value="1" min="1" required /></div>
        <div class="form-group"><label>Unit Rate (₹)</label><input name="rate" type="number" value="250" min="0" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary" ${ips.length ? "" : "disabled"}>Add IP Charge</button></div>
      </form>
    </div>
    <div class="card"><div id="ip-charges-tbl"></div></div>
  `;
  const flatCharges = ips.flatMap((i) => (i.charges || []).map((c) => ({ ipId: i.id, patientName: i.patientName, roomNo: i.roomNo, ...c })));
  mountDataTable(container.querySelector("#ip-charges-tbl"), {
    columns: [
      { key: "ipId", label: "IP No" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Bed" },
      { key: "date", label: "Date" },
      { key: "item", label: "Service / Item" },
      { key: "qty", label: "Qty" },
      { key: "amount", label: "Amount", render: (c) => money(c.amount) }
    ],
    rows: flatCharges
  });
  container.querySelector("#ip-srv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ip = ips.find((x) => x.id === fd.get("ipId"));
    if (!ip) return;
    const qty = Number(fd.get("qty"));
    const rate = Number(fd.get("rate"));
    const nextCharges = [...(ip.charges || []), { date: todayISO(), item: fd.get("item"), qty, rate, amount: qty * rate }];
    await db.update("ip_admissions", ip.id, { charges: nextCharges });
    toast("Service charge added to inpatient ledger.", "success");
    renderIpServiceLog(container, isMisc);
  };
}

async function renderIpDischarge(container) {
  const [ips, rooms] = await Promise.all([db.list("ip_admissions"), db.list("rooms")]);
  const activeIps = ips.filter((i) => i.status === "Admitted");

  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient Clinical &amp; Financial Discharge</h2><p>Finalize IP bills, deduct advance deposits, release bed to cleaning, and print discharge summary.</p></div></div>
    <div class="card">
      <div id="ip-disch-tbl"></div>
    </div>
  `;

  mountDataTable(container.querySelector("#ip-disch-tbl"), {
    columns: [
      { key: "id", label: "IP No" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Bed" },
      { key: "gross", label: "Total Charges", render: (i) => money((i.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0)) },
      { key: "advancePaid", label: "Advance", render: (i) => money(i.advancePaid) },
      {
        key: "act",
        label: "Discharge",
        noExport: true,
        render: (i) => `<button class="btn btn-sm btn-danger" data-disch="${esc(i.id)}">Process Discharge</button>`
      }
    ],
    rows: activeIps,
    emptyText: "No admitted patients pending discharge."
  });

  container.querySelector("#ip-disch-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-disch]");
    if (!btn) return;
    const ip = activeIps.find((x) => x.id === btn.dataset.disch);
    const gross = (ip.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const balance = Math.max(0, gross - Number(ip.advancePaid || 0));

    openModal({
      title: `Discharge Settlement: ${ip.patientName} (${ip.id})`,
      bodyHtml: `
        <form id="disch-form">
          <div class="alert alert-info">Total Charges: <strong>${money(gross)}</strong> | Advance Paid: <strong>${money(ip.advancePaid)}</strong> | Net Balance Due: <strong>${money(balance)}</strong></div>
          <div class="form-grid">
            <div class="form-group"><label>Discharge Condition</label><select name="condition"><option>Recovered / Stable</option><option>Improved</option><option>Referred</option></select></div>
            <div class="form-group"><label>Balance Payment Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Insurance</option></select></div>
            <div class="form-group form-span-2"><label>Discharge Advice &amp; Medications</label><textarea name="advice" rows="3">Continue prescribed oral medications. Review in OPD after 5 days.</textarea></div>
          </div>
          <div class="form-actions"><button type="submit" class="btn btn-danger">Confirm Discharge &amp; Print Summary</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#disch-form").onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          await db.update("ip_admissions", ip.id, {
            status: "Discharged",
            dischargeDate: todayISO(),
            dischargeCondition: fd.get("condition"),
            dischargeAdvice: fd.get("advice")
          });
          const bed = rooms.find((r) => r.roomNo === ip.roomNo);
          if (bed) {
            await db.update("rooms", bed.id, { status: "Cleaning", housekeeping: "Sanitizing", patientUhid: "", patientName: "" });
          }
          if (balance > 0) {
            const billId = await db.nextSequence("CSH");
            await db.add("cashier_bills", {
              id: billId,
              billDate: todayISO(),
              uhid: ip.uhid,
              patientName: ip.patientName,
              doctorName: ip.doctorName,
              department: "IP Final Discharge",
              items: ip.charges.map((c) => ({ desc: c.item, qty: c.qty, rate: c.rate, amount: c.amount })),
              grossAmount: gross,
              discount: Number(ip.advancePaid || 0),
              netAmount: balance,
              paidAmount: balance,
              paymentMode: fd.get("paymentMode"),
              status: "Paid",
              billedBy: auth.getCurrentUser().username
            });
          }
          closeModal();
          toast("Patient discharged and bed moved to cleaning.", "success");
          await printA4Document({
            docTitle: "Inpatient Discharge Summary & Final Settlement",
            metaPairs: [
              ["IP No", ip.id], ["UHID", ip.uhid], ["Patient", ip.patientName],
              ["Doctor", ip.doctorName], ["Admit Date", ip.admitDate], ["Discharge Date", todayISO()],
              ["Diagnosis", ip.diagnosis], ["Condition", fd.get("condition")]
            ],
            bodyHtml: `<p><strong>Advice:</strong> ${esc(fd.get("advice"))}</p><p><strong>Gross Charges:</strong> ${money(gross)} | <strong>Advance:</strong> ${money(ip.advancePaid)} | <strong>Final Paid:</strong> ${money(balance)}</p>`
          });
          renderIpDischarge(container);
        };
      }
    });
  };
}

async function renderTestEnquiry(container) {
  const tests = await db.list("lab_tests_master");
  container.innerHTML = `
    <div class="module-header"><div><h2>Diagnostic Test Tariff &amp; Turnaround Enquiry</h2><p>Quick front-desk lookup for lab, X-ray, and scan pricing and TAT.</p></div></div>
    <div class="card"><div id="test-enq-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#test-enq-tbl"), {
    columns: [
      { key: "category", label: "Category" },
      { key: "name", label: "Investigation Name" },
      { key: "unit", label: "Unit" },
      { key: "normalRange", label: "Reference Range" },
      { key: "tatHours", label: "TAT (Hrs)" },
      { key: "price", label: "Tariff", render: (t) => money(t.price) }
    ],
    rows: tests,
    searchPlaceholder: "Search test name, category..."
  });
}

async function renderAlertsQueue(container, scope) {
  const [patients, doctors] = await Promise.all([db.list("patients"), db.list("doctors")]);
  const rows = scope === "Doctors"
    ? doctors.map((d) => ({ name: d.name, phone: d.phone, detail: `${d.specialisation} Shift Reminder`, date: todayISO() }))
    : patients.map((p) => ({ name: p.fullName, phone: p.phone, detail: scope === "Vaccination" ? "Immunization Due Reminder" : `Follow-up (${p.uhid})`, date: todayISO() }));

  container.innerHTML = `
    <div class="module-header"><div><h2>${esc(scope)} Alert &amp; Reminder Queue</h2><p>Automated follow-up, shift, and vaccination alert list.</p></div></div>
    <div class="card"><div id="alerts-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#alerts-tbl"), {
    columns: [
      { key: "name", label: "Recipient" },
      { key: "phone", label: "Mobile" },
      { key: "detail", label: "Alert Message" },
      { key: "date", label: "Due Date" },
      {
        key: "act",
        label: "Notify",
        noExport: true,
        render: (r) => `<button class="btn btn-sm btn-success" data-send='${esc(JSON.stringify(r))}'>Send WhatsApp/SMS</button>`
      }
    ],
    rows
  });
  container.querySelector("#alerts-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-send]");
    if (!btn) return;
    const row = JSON.parse(btn.dataset.send);
    const res = await queueOrSendNotification({
      recipientName: row.name,
      phone: row.phone,
      channel: "WhatsApp",
      category: scope,
      message: `Hello ${row.name}, Reminder from CuraTech Hospital: ${row.detail}.`
    });
    toast("Alert logged in SMS/WhatsApp queue.", "success");
    if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
  };
}

async function renderSendSms(container) {
  const logs = await db.list("sms_logs");
  container.innerHTML = `
    <div class="module-header"><div><h2>SMS &amp; WhatsApp Notification Composer</h2><p>Send manual reminders via configured SMS Webhook or direct WhatsApp Web link.</p></div></div>
    <div class="card">
      <form id="sms-form" class="form-grid">
        <div class="form-group"><label>Recipient Name *</label><input name="recipientName" required /></div>
        <div class="form-group"><label>Mobile Number *</label><input name="phone" required placeholder="10-digit mobile" /></div>
        <div class="form-group"><label>Channel</label><select name="channel"><option>WhatsApp</option><option>SMS</option></select></div>
        <div class="form-group"><label>Category</label><select name="category"><option>Appointment</option><option>Lab Report Ready</option><option>Pharmacy Refill</option><option>Vaccination</option></select></div>
        <div class="form-group form-span-2"><label>Message Text *</label><textarea name="message" rows="2" required>Dear Patient, your consultation/report update from CuraTech Hospital is ready.</textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-success">Dispatch Notification</button></div>
      </form>
    </div>
    <div class="card"><div id="sms-log-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#sms-log-tbl"), {
    columns: [
      { key: "sentAt", label: "Sent At", render: (r) => esc(new Date(r.sentAt).toLocaleString()) },
      { key: "recipientName", label: "Recipient" },
      { key: "phone", label: "Phone" },
      { key: "channel", label: "Channel" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" }
    ],
    rows: logs
  });
  container.querySelector("#sms-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await queueOrSendNotification({
      recipientName: fd.get("recipientName"),
      phone: fd.get("phone"),
      channel: fd.get("channel"),
      category: fd.get("category"),
      message: fd.get("message")
    });
    toast(`Notification ${res.record.status}`, "success");
    if (fd.get("channel") === "WhatsApp" && res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
    renderSendSms(container);
  };
}

async function renderDutyAllotment(container, roleType) {
  const duties = await db.list("duty_roster");
  container.innerHTML = `
    <div class="module-header"><div><h2>Staff Duty Allotment (${esc(roleType)})</h2><p>Schedule doctor, nursing, and shift rosters.</p></div></div>
    <div class="card">
      <form id="duty-form" class="form-grid">
        <div class="form-group"><label>Staff / Doctor Name *</label><input name="staffName" required /></div>
        <div class="form-group"><label>Role</label><select name="role"><option ${roleType === "Doctor" ? "selected" : ""}>Doctor</option><option ${roleType === "Nurse" ? "selected" : ""}>Nurse</option><option>Technician</option><option>Pharmacist</option></select></div>
        <div class="form-group"><label>Shift</label><select name="shift"><option>Morning (8AM - 2PM)</option><option>Afternoon (2PM - 8PM)</option><option>Night (8PM - 8AM)</option></select></div>
        <div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Ward / Station</label><input name="station" value="OPD / General Ward" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Assign Shift</button></div>
      </form>
    </div>
    <div class="card"><div id="duty-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#duty-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "staffName", label: "Staff Name" },
      { key: "role", label: "Role" },
      { key: "shift", label: "Shift" },
      { key: "station", label: "Ward / Station" }
    ],
    rows: duties
  });
  container.querySelector("#duty-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("duty_roster", {
      date: fd.get("date"),
      staffName: fd.get("staffName"),
      role: fd.get("role"),
      shift: fd.get("shift"),
      station: fd.get("station")
    });
    toast("Duty shift assigned.", "success");
    renderDutyAllotment(container, roleType);
  };
}
