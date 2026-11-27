/**
 * Doctor Clinical Workbench: Prescreening Vitals, OP Consultation & e-Rx,
 * IP Ward Rounds, Daycare, Diet Management, Longitudinal Patient History & OBG Registers.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, mountDataTable, openModal, closeModal, toast } from "../ui.js";
import { printA4Document } from "../print.js";

export async function renderDoctorView(viewId, container) {
  switch (viewId) {
    case "doc_prescreening":
      return renderPrescreening(container);
    case "doc_op_dashboard":
      return renderOpDashboard(container);
    case "doc_ip_dashboard":
      return renderIpRounds(container);
    case "doc_daycare":
      return renderDaycare(container);
    case "doc_diet":
      return renderDietManagement(container);
    case "doc_patient_history":
      return renderPatientHistory(container);
    case "doc_edd_report":
      return renderObgRegister(container, "EDD Antenatal Register", "obg_edd", [
        { name: "patientName", label: "Mother Name" },
        { name: "uhid", label: "UHID" },
        { name: "lmpDate", label: "LMP Date", type: "date" },
        { name: "eddDate", label: "Expected Delivery Date (EDD)", type: "date" },
        { name: "riskStatus", label: "Risk Category" }
      ]);
    case "doc_delivery_report":
      return renderObgRegister(container, "Obstetric Delivery Register", "obg_deliveries", [
        { name: "motherName", label: "Mother Name" },
        { name: "uhid", label: "UHID" },
        { name: "deliveryDate", label: "Delivery Date", type: "date" },
        { name: "deliveryType", label: "Mode (Normal / LSCS)" },
        { name: "babyGenderWeight", label: "Baby Gender & Weight (kg)" }
      ]);
    case "doc_iud_report":
      return renderObgRegister(container, "Sterilisation / IUD Acceptor Register", "obg_iud", [
        { name: "patientName", label: "Patient Name" },
        { name: "uhid", label: "UHID" },
        { name: "procedureDate", label: "Procedure Date", type: "date" },
        { name: "method", label: "Method (Cu-T / Tubectomy / PPIUCD)" },
        { name: "surgeon", label: "Doctor / Surgeon" }
      ]);
    case "doc_review_appt":
      return renderReviewBooking(container);
    default:
      return renderOpDashboard(container);
  }
}

async function renderPrescreening(container) {
  const visits = (await db.list("op_visits")).filter((v) => v.visitDate === todayISO());
  container.innerHTML = `
    <div class="module-header"><div><h2>Nursing Prescreening &amp; Vital Signs</h2><p>Record BP, pulse, temperature, height, weight, auto-BMI, SpO2, and chief complaints before doctor exam.</p></div></div>
    <div class="card">
      <form id="vitals-form" class="form-grid">
        <div class="form-group form-span-2">
          <label>Select OP Visit *</label>
          <select name="visitId" required>
            ${visits.map((v) => `<option value="${esc(v.id)}">Token #${esc(v.tokenNo)} — ${esc(v.patientName)} (${esc(v.doctorName)}) [${esc(v.status)}]</option>`).join("") || `<option value="">No OP visits today</option>`}
          </select>
        </div>
        <div class="form-group"><label>BP (mmHg)</label><input name="bp" placeholder="120/80" required /></div>
        <div class="form-group"><label>Pulse (bpm)</label><input name="pulse" type="number" placeholder="76" required /></div>
        <div class="form-group"><label>Temperature (°F)</label><input name="temp" step="0.1" type="number" placeholder="98.6" required /></div>
        <div class="form-group"><label>SpO2 (%)</label><input name="spo2" type="number" value="98" required /></div>
        <div class="form-group"><label>Height (cm)</label><input name="height" id="v-ht" type="number" placeholder="170" /></div>
        <div class="form-group"><label>Weight (kg)</label><input name="weight" id="v-wt" type="number" step="0.1" placeholder="68" /></div>
        <div class="form-group"><label>Calculated BMI</label><input name="bmi" id="v-bmi" readonly placeholder="Auto" /></div>
        <div class="form-group form-span-2"><label>Chief Complaints</label><input name="complaint" required placeholder="Patient symptoms &amp; duration" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary" ${visits.length ? "" : "disabled"}>Save Prescreening Vitals</button></div>
      </form>
    </div>
  `;
  const ht = container.querySelector("#v-ht");
  const wt = container.querySelector("#v-wt");
  const bmi = container.querySelector("#v-bmi");
  const calcBmi = () => {
    const h = Number(ht.value) / 100;
    const w = Number(wt.value);
    bmi.value = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : "";
  };
  ht.oninput = calcBmi;
  wt.oninput = calcBmi;

  container.querySelector("#vitals-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.update("op_visits", fd.get("visitId"), {
      status: "Prescreened",
      vitals: {
        bp: fd.get("bp"),
        pulse: Number(fd.get("pulse")),
        temp: fd.get("temp"),
        spo2: Number(fd.get("spo2")),
        heightCm: Number(fd.get("height") || 0),
        weightKg: Number(fd.get("weight") || 0),
        bmi: fd.get("bmi")
      },
      chiefComplaint: fd.get("complaint")
    });
    toast("Vitals recorded. Patient moved to Doctor OP Queue!", "success");
    renderPrescreening(container);
  };
}

async function renderOpDashboard(container) {
  const [visits, meds, labTests, icds] = await Promise.all([
    db.list("op_visits"),
    db.list("medicines"),
    db.list("lab_tests"),
    db.list("masters")
  ]);
  const icdCodes = icds.filter((m) => m.catalog === "ICD Code");

  container.innerHTML = `
    <div class="module-header"><div><h2>Doctor Outpatient (OP) Consultation Workbench</h2><p>Review vitals, enter clinical notes &amp; ICD diagnosis, issue E-Prescriptions, and order lab investigations.</p></div></div>
    <div class="card"><div id="doc-op-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#doc-op-tbl"), {
    columns: [
      { key: "tokenNo", label: "Token" },
      { key: "visitDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "chiefComplaint", label: "Complaint" },
      { key: "status", label: "Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : "badge-blue"}">${esc(v.status)}</span>` },
      {
        key: "act",
        label: "Consult",
        noExport: true,
        render: (v) => `<button class="btn btn-sm btn-primary" data-consult="${esc(v.id)}">${v.status === "Completed" ? "View / Revise" : "Open EMR"}</button>`
      }
    ],
    rows: visits
  });

  container.querySelector("#doc-op-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-consult]");
    if (!btn) return;
    const visit = visits.find((v) => v.id === btn.dataset.consult);
    if (!visit) return;
    const vt = visit.vitals || {};
    const rxItems = [];

    openModal({
      title: `EMR Consultation: ${visit.patientName} (${visit.uhid})`,
      width: "780px",
      bodyHtml: `
        <div class="alert alert-info">
          <strong>Vitals:</strong> BP ${esc(vt.bp || "-")} | Pulse ${esc(vt.pulse || "-")} | Temp ${esc(vt.temp || "-")}°F | SpO2 ${esc(vt.spo2 || "-")}% | BMI ${esc(vt.bmi || "-")}<br/>
          <strong>Complaint:</strong> ${esc(visit.chiefComplaint || "-")}
        </div>
        <form id="emr-form">
          <div class="form-grid">
            <div class="form-group">
              <label>ICD-10 / Diagnosis *</label>
              <input name="icdDiagnosis" list="icd-list" value="${esc(visit.diagnosis || "")}" required placeholder="e.g. J06.9 Acute URI" />
              <datalist id="icd-list">${icdCodes.map((c) => `<option value="${esc(c.code)} - ${esc(c.name)}"></option>`).join("")}</datalist>
            </div>
            <div class="form-group"><label>Follow-Up Date</label><input name="followUpDate" type="date" /></div>
            <div class="form-group form-span-2"><label>Clinical Examination Notes</label><textarea name="clinicalNotes" rows="2">${esc(visit.clinicalNotes || "")}</textarea></div>
          </div>

          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
            <strong style="font-size:13px;">E-Prescription Builder</strong>
            <div class="form-grid" style="margin-top:6px;">
              <div class="form-group"><label>Medicine</label><select id="rx-med">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (Stock: ${m.stock})</option>`).join("")}</select></div>
              <div class="form-group"><label>Frequency</label><select id="rx-freq"><option>1-0-1 After Food</option><option>1-1-1 After Food</option><option>0-0-1 Bedtime</option><option>1-0-0 Before Food</option></select></div>
              <div class="form-group"><label>Days</label><input id="rx-days" type="number" value="5" min="1" /></div>
              <div class="form-group"><label>Total Qty</label><input id="rx-qty" type="number" value="10" min="1" /></div>
              <div class="form-actions" style="align-self:end;"><button type="button" class="btn btn-sm btn-success" id="rx-add-btn">+ Add Med</button></div>
            </div>
            <div id="rx-list-preview" style="margin-top:8px;font-size:12px;"></div>
          </div>

          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
            <strong style="font-size:13px;">Order Lab / Scan Investigation (Optional)</strong>
            <select name="labTestId" style="margin-top:6px;width:100%;padding:6px;">
              <option value="">-- No Lab Order --</option>
              ${labTests.map((t) => `<option value="${esc(t.id)}">${esc(t.category)}: ${esc(t.name)}</option>`).join("")}
            </select>
          </div>

          <div class="form-actions" style="margin-top:14px;">
            <button type="submit" class="btn btn-primary">Save EMR, Issue E-Rx &amp; Print</button>
          </div>
        </form>
      `,
      onMount: (slot) => {
        const refreshRx = () => {
          slot.querySelector("#rx-list-preview").innerHTML = rxItems.length
            ? rxItems.map((r, i) => `<div>${i + 1}. <strong>${esc(r.medName)}</strong> — ${esc(r.freq)} × ${r.days} days (Qty: ${r.qty})</div>`).join("")
            : `<span style="color:var(--text-muted);">No medicines added yet.</span>`;
        };
        refreshRx();

        slot.querySelector("#rx-add-btn").onclick = () => {
          const med = meds.find((m) => m.id === slot.querySelector("#rx-med").value);
          if (!med) return;
          rxItems.push({
            medId: med.id,
            medName: med.name,
            freq: slot.querySelector("#rx-freq").value,
            days: Number(slot.querySelector("#rx-days").value),
            qty: Number(slot.querySelector("#rx-qty").value)
          });
          refreshRx();
        };

        slot.querySelector("#emr-form").onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          await db.update("op_visits", visit.id, {
            status: "Completed",
            diagnosis: fd.get("icdDiagnosis"),
            clinicalNotes: fd.get("clinicalNotes"),
            followUpDate: fd.get("followUpDate")
          });
          if (rxItems.length) {
            const rxId = await db.nextSequence("RX");
            await db.add("prescriptions", {
              id: rxId,
              visitId: visit.id,
              rxDate: todayISO(),
              uhid: visit.uhid,
              patientName: visit.patientName,
              doctorName: visit.doctorName,
              items: rxItems,
              status: "Pending Dispense"
            });
          }
          const ltId = fd.get("labTestId");
          if (ltId) {
            const t = labTests.find((x) => x.id === ltId);
            if (t) {
              const labId = await db.nextSequence("LAB");
              await db.add("lab_orders", {
                id: labId,
                orderDate: todayISO(),
                uhid: visit.uhid,
                patientName: visit.patientName,
                category: t.category,
                testName: t.name,
                unit: t.unit,
                normalRange: t.normalRange,
                price: Number(t.price),
                source: "In-House",
                status: "Pending",
                tatTargetHours: t.tatHours || 4
              });
            }
          }
          toast("Consultation saved & E-Prescription sent to Pharmacy!", "success");
          closeModal();
          await printA4Document({
            docTitle: "Outpatient Consultation & E-Prescription",
            metaPairs: [["UHID", visit.uhid], ["Patient", visit.patientName], ["Doctor", visit.doctorName], ["Date", todayISO()]],
            bodyHtml: `
              <p><strong>Diagnosis:</strong> ${esc(fd.get("icdDiagnosis"))}</p>
              <p><strong>Clinical Notes:</strong> ${esc(fd.get("clinicalNotes"))}</p>
              <h4>Rx</h4>
              <ul>${rxItems.map((r) => `<li><strong>${esc(r.medName)}</strong> — ${esc(r.freq)} (${r.days} days, Qty: ${r.qty})</li>`).join("") || "<li>No medicines prescribed</li>"}</ul>
            `,
            signatureLabel: visit.doctorName
          });
          renderOpDashboard(container);
        };
      }
    });
  };
}

async function renderIpRounds(container) {
  const [ips, rounds] = await Promise.all([db.list("ip_admissions"), db.list("ip_rounds")]);
  const active = ips.filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient Ward Rounds &amp; Progress Notes</h2></div></div>
    <div class="card">
      <form id="ip-rnd-form" class="form-grid">
        <div class="form-group"><label>Inpatient *</label><select name="ipId" required>${active.map((i) => `<option value="${esc(i.id)}">${esc(i.id)} — ${esc(i.patientName)} (${esc(i.roomNo)})</option>`).join("") || `<option value="">No active inpatients</option>`}</select></div>
        <div class="form-group"><label>Round Vitals / Condition</label><input name="condition" value="Afebrile, vitals stable" required /></div>
        <div class="form-group form-span-2"><label>Progress Note &amp; Medication Orders *</label><textarea name="notes" rows="2" required></textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary" ${active.length ? "" : "disabled"}>Save Ward Round Note</button></div>
      </form>
    </div>
    <div class="card"><div id="ip-rnd-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ip-rnd-tbl"), {
    columns: [
      { key: "date", label: "Time" },
      { key: "ipId", label: "IP ID" },
      { key: "patientName", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "condition", label: "Condition" },
      { key: "notes", label: "Progress Notes" }
    ],
    rows: rounds
  });
  container.querySelector("#ip-rnd-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ip = active.find((i) => i.id === fd.get("ipId"));
    if (!ip) return;
    await db.add("ip_rounds", {
      date: new Date().toLocaleString(),
      ipId: ip.id,
      patientName: ip.patientName,
      doctor: auth.getCurrentUser().fullName,
      condition: fd.get("condition"),
      notes: fd.get("notes")
    });
    toast("IP round note logged.", "success");
    renderIpRounds(container);
  };
}

async function renderDaycare(container) {
  const [patients, logs] = await Promise.all([db.list("patients"), db.list("daycare_logs")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Daycare Observation &amp; Minor Procedures</h2></div></div>
    <div class="card">
      <form id="dc-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="patientId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Procedure / Infusion *</label><input name="procedure" required placeholder="e.g. IV Iron Infusion / Suturing" /></div>
        <div class="form-group"><label>Observation Hours</label><input name="hours" type="number" value="4" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Record Daycare Entry</button></div>
      </form>
    </div>
    <div class="card"><div id="dc-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#dc-tbl"), {
    columns: [{ key: "date", label: "Date" }, { key: "uhid", label: "UHID" }, { key: "patientName", label: "Patient" }, { key: "procedure", label: "Procedure" }, { key: "hours", label: "Hours" }],
    rows: logs
  });
  container.querySelector("#dc-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    await db.add("daycare_logs", { date: todayISO(), uhid: pat.uhid, patientName: pat.fullName, procedure: fd.get("procedure"), hours: fd.get("hours") });
    toast("Daycare entry logged.", "success");
    renderDaycare(container);
  };
}

async function renderDietManagement(container) {
  const ips = (await db.list("ip_admissions")).filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>Therapeutic Inpatient Diet Management</h2></div></div>
    <div class="card"><div id="diet-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#diet-tbl"), {
    columns: [
      { key: "id", label: "IP ID" },
      { key: "patientName", label: "Patient" },
      { key: "roomNo", label: "Room" },
      { key: "dietPlan", label: "Prescribed Diet", render: (i) => esc(i.dietPlan || i.diet || "Normal Balanced Diet") },
      { key: "act", label: "Update", noExport: true, render: (i) => `<button class="btn btn-sm btn-primary" data-diet="${esc(i.id)}">Set Therapeutic Diet</button>` }
    ],
    rows: ips
  });
  container.querySelector("#diet-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-diet]");
    if (!btn) return;
    const ip = ips.find((i) => i.id === btn.dataset.diet);
    openModal({
      title: `Diet Order: ${ip.patientName}`,
      width: "440px",
      bodyHtml: `
        <form id="diet-form">
          <div class="form-group">
            <label>Therapeutic Diet</label>
            <select name="diet">
              <option>Normal Balanced Diet</option>
              <option>Diabetic Low-GI Diet</option>
              <option>Low Salt Cardiac / Renal Diet</option>
              <option>Soft Bland Post-Op Diet</option>
              <option>Clear Liquid / Ryles Tube Feed</option>
            </select>
          </div>
          <div class="form-actions"><button type="submit" class="btn btn-primary">Assign Diet</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#diet-form").onsubmit = async (ev) => {
          ev.preventDefault();
          await db.update("ip_admissions", ip.id, { dietPlan: new FormData(ev.target).get("diet") });
          toast("Diet order updated.", "success");
          closeModal();
          renderDietManagement(container);
        };
      }
    });
  };
}

async function renderPatientHistory(container) {
  const [patients, visits, ips, rxs, labs] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("ip_admissions"),
    db.list("prescriptions"),
    db.list("lab_orders")
  ]);

  container.innerHTML = `
    <div class="module-header"><div><h2>Longitudinal Patient Medical History (EMR Timeline)</h2></div></div>
    <div class="card">
      <div class="form-group" style="max-width:420px;">
        <label>Select Patient UHID</label>
        <select id="hist-pat-sel">
          ${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div id="hist-body"></div>
  `;

  const renderTimeline = () => {
    const uhid = container.querySelector("#hist-pat-sel").value;
    const pat = patients.find((p) => p.uhid === uhid);
    if (!pat) return;
    const pv = visits.filter((v) => v.uhid === uhid);
    const pi = ips.filter((i) => i.uhid === uhid);
    const pr = rxs.filter((r) => r.uhid === uhid);
    const pl = labs.filter((l) => l.uhid === uhid);

    container.querySelector("#hist-body").innerHTML = `
      <div class="alert alert-info"><strong>${esc(pat.fullName)}</strong> (${esc(pat.age)}/${esc(pat.gender)}) | Blood: ${esc(pat.bloodGroup)} | Allergies: <strong>${esc(pat.allergies || "None")}</strong></div>
      <div class="grid-2">
        <div class="card"><h3 class="card-title">OP Visits (${pv.length})</h3>${pv.map((v) => `<div style="margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;"><strong>${esc(v.visitDate)}</strong> — ${esc(v.doctorName)}<br/>Dx: ${esc(v.diagnosis || "Pending")}</div>`).join("") || "None"}</div>
        <div class="card"><h3 class="card-title">IP Admissions (${pi.length})</h3>${pi.map((i) => `<div style="margin-bottom:8px;"><strong>${esc(i.id)}</strong> (${esc(i.admitDate)}) — ${esc(i.diagnosis)} [${esc(i.status)}]</div>`).join("") || "None"}</div>
        <div class="card"><h3 class="card-title">Prescriptions (${pr.length})</h3>${pr.map((r) => `<div style="margin-bottom:8px;"><strong>${esc(r.rxDate)}</strong>: ${(r.items || []).map((x) => esc(x.medName)).join(", ")}</div>`).join("") || "None"}</div>
        <div class="card"><h3 class="card-title">Diagnostic Reports (${pl.length})</h3>${pl.map((l) => `<div style="margin-bottom:8px;"><strong>${esc(l.orderDate)}</strong>: ${esc(l.testName)} — <strong>${esc(l.resultValue || l.status)}</strong></div>`).join("") || "None"}</div>
      </div>
    `;
  };
  container.querySelector("#hist-pat-sel").onchange = renderTimeline;
  renderTimeline();
}

async function renderObgRegister(container, title, colName, fields) {
  const rows = await db.list(colName);
  container.innerHTML = `
    <div class="module-header"><div><h2>${esc(title)}</h2></div></div>
    <div class="card">
      <form id="obg-form" class="form-grid">
        ${fields.map((f) => `<div class="form-group"><label>${esc(f.label)} *</label><input name="${esc(f.name)}" type="${f.type || "text"}" required /></div>`).join("")}
        <div class="form-actions"><button type="submit" class="btn btn-primary">Add Register Entry</button></div>
      </form>
    </div>
    <div class="card"><div id="obg-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#obg-tbl"), {
    columns: fields.map((f) => ({ key: f.name, label: f.label })),
    rows,
    exportFileName: `${colName}.csv`,
    printTitle: title
  });
  container.querySelector("#obg-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = { recordDate: todayISO() };
    fields.forEach((f) => { obj[f.name] = fd.get(f.name); });
    if (obj.method) obj.field1 = obj.method;
    if (obj.surgeon) obj.field2 = obj.surgeon;
    await db.add(colName, obj);
    toast("Record saved.", "success");
    renderObgRegister(container, title, colName, fields);
  };
}

async function renderReviewBooking(container) {
  const [patients, masters] = await Promise.all([db.list("patients"), db.list("masters")]);
  const doctors = masters.filter((m) => m.catalog === "Service Providers");
  container.innerHTML = `
    <div class="module-header"><div><h2>Schedule Doctor Review / Follow-Up</h2></div></div>
    <div class="card">
      <form id="rev-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="patientId">${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Doctor</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Review Date</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Review Time</label><input name="time" type="time" value="11:00" required /></div>
        <div class="form-group"><label>Review Purpose</label><input name="notes" value="Post-treatment review" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Schedule Follow-Up</button></div>
      </form>
    </div>
  `;
  container.querySelector("#rev-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.id === fd.get("patientId"));
    await db.add("appointments", { uhid: pat.uhid, patientName: pat.fullName, phone: pat.phone, doctorName: fd.get("doctorName"), date: fd.get("date"), time: fd.get("time"), notes: fd.get("notes"), status: "Review Scheduled" });
    toast("Review appointment booked.", "success");
  };
}
