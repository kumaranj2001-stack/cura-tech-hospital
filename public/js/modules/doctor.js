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
            ${visits.map((v) => `<option value="${esc(v.id)}">Token #${v.tokenNo} — ${esc(v.patientName)} (${esc(v.doctorName)}) [${esc(v.status)}]</option>`).join("") || `<option value="">No OP visits today</option>`}
          </select>
        </div>
        <div class="form-group"><label>BP (mmHg)</label><input name="bp" placeholder="120/80" required /></div>
        <div class="form-group"><label>Pulse (bpm)</label><input name="pulse" type="number" placeholder="76" required /></div>
        <div class="form-group"><label>Temperature (°F)</label><input name="temp" step="0.1" type="number" placeholder="98.6" required /></div>
        <div class="form-group"><label>SpO2 (%)</label><input name="spo2" type="number" value="98" required /></div>
        <div class="form-group"><label>Height (cm)</label><input name="height" id="v-ht" type="number" placeholder="170" /></div>
        <div class="form-group"><label>Weight (kg)</label><input name="weight" id="v-wt" type="number" step="0.1" placeholder="68" /></div>
        <div class="form-group"><label>Calculated BMI</label><input name="bmi" id="v-bmi" readonly placeholder="Auto" /></div>
        <div class="form-group form-span-2"><label>Chief Complaints</label><input name="complaint" required placeholder="Patient symptoms & duration" /></div>
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
        pulse: fd.get("pulse"),
        temp: fd.get("temp"),
        spo2: fd.get("spo2"),
        height: fd.get("height"),
        weight: fd.get("weight"),
        bmi: fd.get("bmi"),
        complaint: fd.get("complaint")
      }
    });
    toast("Vitals recorded and sent to Doctor queue.", "success");
    renderPrescreening(container);
  };
}

async function renderOpDashboard(container) {
  const [visits, patients, medicines, tests, masters] = await Promise.all([
    db.list("op_visits"),
    db.list("patients"),
    db.list("medicines"),
    db.list("lab_tests_master"),
    db.list("masters")
  ]);
  const todayVisits = visits.filter((v) => v.visitDate === todayISO());
  const icdList = masters.filter((m) => m.catalog === "ICD Code");

  container.innerHTML = `
    <div class="module-header"><div><h2>Doctor OP Consultation &amp; E-Prescription Workbench</h2><p>Active patient queue, clinical notes, ICD-10 diagnosis, e-prescriptions, and lab orders.</p></div></div>
    <div class="card"><div id="doc-queue-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#doc-queue-tbl"), {
    columns: [
      { key: "tokenNo", label: "Token", render: (v) => `<strong>#${v.tokenNo}</strong>` },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient Name" },
      { key: "doctorName", label: "Doctor" },
      { key: "vitals", label: "Vitals Summary", render: (v) => v.vitals ? `BP ${esc(v.vitals.bp)} | T ${esc(v.vitals.temp)}°F | SpO2 ${esc(v.vitals.spo2)}%` : "Pending Vitals" },
      { key: "status", label: "Status", render: (v) => `<span class="badge ${v.status === "Completed" ? "badge-green" : "badge-amber"}">${esc(v.status)}</span>` },
      {
        key: "act",
        label: "Consult",
        noExport: true,
        render: (v) => `<button class="btn btn-sm btn-primary" data-consult="${esc(v.id)}">${v.status === "Completed" ? "View / Print Rx" : "Open EMR"}</button>`
      }
    ],
    rows: todayVisits,
    searchPlaceholder: "Search patient, UHID..."
  });

  container.querySelector("#doc-queue-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-consult]");
    if (!btn) return;
    const visit = todayVisits.find((v) => v.id === btn.dataset.consult);
    const pat = patients.find((p) => p.uhid === visit.uhid) || {};
    const rxItems = [];

    openModal({
      title: `EMR & E-Prescription: ${visit.patientName} (${visit.uhid})`,
      width: "860px",
      bodyHtml: `
        ${pat.allergies && pat.allergies !== "None" ? `<div class="alert alert-error"><strong>Allergy Warning:</strong> ${esc(pat.allergies)}</div>` : ""}
        ${visit.vitals ? `<div class="alert alert-info"><strong>Vitals:</strong> BP ${esc(visit.vitals.bp)} | Pulse ${esc(visit.vitals.pulse)} | Temp ${esc(visit.vitals.temp)}°F | BMI ${esc(visit.vitals.bmi || "-")} | Complaint: ${esc(visit.vitals.complaint)}</div>` : ""}
        <form id="emr-form">
          <div class="form-grid">
            <div class="form-group">
              <label>ICD-10 Diagnosis</label>
              <select name="icdDiagnosis">
                <option value="">-- Select ICD Code / Diagnosis --</option>
                ${icdList.map((i) => `<option value="${esc(i.code)} - ${esc(i.name)}">${esc(i.code)} — ${esc(i.name)}</option>`).join("")}
                <option value="Viral Fever">Viral Fever</option>
              </select>
            </div>
            <div class="form-group">
              <label>Order Diagnostic Lab Test</label>
              <select name="labTestId">
                <option value="">-- None --</option>
                ${tests.map((t) => `<option value="${esc(t.id)}">${esc(t.name)} (₹${t.price})</option>`).join("")}
              </select>
            </div>
            <div class="form-group form-span-2"><label>Clinical Examination Notes</label><textarea name="clinicalNotes" rows="2" required>${esc(visit.clinicalNotes || "NAD, vitals stable.")}</textarea></div>
            <div class="form-group"><label>Follow-up Date</label><input name="followUpDate" type="date" /></div>
            <div class="form-group"><label>Advice</label><input name="advice" value="Drink plenty of fluids, take medications after food." /></div>
          </div>

          <div style="margin-top:14px;border:1px solid var(--border);padding:10px;border-radius:6px;background:var(--surface-alt);">
            <strong>E-Prescription Medicines</strong>
            <div class="form-grid" style="margin-top:8px;">
              <div class="form-group"><label>Medicine</label><select id="rx-med">${medicines.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (Stock: ${m.stock})</option>`).join("")}</select></div>
              <div class="form-group"><label>Frequency</label><select id="rx-freq"><option>1-0-1 (BD)</option><option>1-1-1 (TDS)</option><option>0-0-1 (HS)</option><option>1-0-0 (OD)</option><option>SOS</option></select></div>
              <div class="form-group"><label>Days</label><input id="rx-days" type="number" value="5" min="1" /></div>
              <div class="form-group"><label>Qty</label><input id="rx-qty" type="number" value="10" min="1" /></div>
            </div>
            <button type="button" class="btn btn-sm btn-success" id="btn-add-rx" style="margin-top:8px;">+ Add Medicine to Rx</button>
            <div id="rx-list" style="margin-top:8px;"></div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Consultation &amp; Send to Pharmacy/Lab</button>
          </div>
        </form>
      `,
      onMount: (slot) => {
        const renderRx = () => {
          slot.querySelector("#rx-list").innerHTML = rxItems.length
            ? `<table class="data-table"><thead><tr><th>Medicine</th><th>Freq</th><th>Days</th><th>Qty</th></tr></thead><tbody>${rxItems.map((r) => `<tr><td>${esc(r.medName)}</td><td>${esc(r.freq)}</td><td>${r.days}</td><td>${r.qty}</td></tr>`).join("")}</tbody></table>`
            : `<div style="font-size:12px;color:var(--text-muted);">No medicines added yet.</div>`;
        };
        renderRx();

        slot.querySelector("#btn-add-rx").onclick = () => {
          const med = medicines.find((m) => m.id === slot.querySelector("#rx-med").value);
          if (!med) return;
          rxItems.push({
            medId: med.id,
            medName: med.name,
            freq: slot.querySelector("#rx-freq").value,
            days: Number(slot.querySelector("#rx-days").value),
            qty: Number(slot.querySelector("#rx-qty").value)
          });
          renderRx();
        };

        slot.querySelector("#emr-form").onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          await db.update("op_visits", visit.id, {
            status: "Completed",
            diagnosis: fd.get("icdDiagnosis"),
            clinicalNotes: fd.get("clinicalNotes"),
            followUpDate: fd.get("followUpDate"),
            advice: fd.get("advice"),
            prescription: rxItems
          });

          if (rxItems.length) {
            await db.add("prescriptions", {
              visitId: visit.id,
              rxDate: todayISO(),
              uhid: visit.uhid,
              patientName: visit.patientName,
              doctorName: visit.doctorName,
              items: rxItems,
              status: "Pending Dispense"
            });
          }

          const labTestId = fd.get("labTestId");
          if (labTestId) {
            const tst = tests.find((t) => t.id === labTestId);
            if (tst) {
              const labId = await db.nextSequence("LAB");
              await db.add("lab_orders", {
                id: labId,
                orderDate: todayISO(),
                uhid: visit.uhid,
                patientName: visit.patientName,
                doctorName: visit.doctorName,
                category: tst.category,
                testName: tst.name,
                price: tst.price,
                source: "Internal",
                status: "Pending",
                unit: tst.unit,
                normalRange: tst.normalRange,
                resultValue: ""
              });
            }
          }

          closeModal();
          toast("Consultation saved and pushed to Pharmacy & Lab.", "success");
          await printA4Document({
            docTitle: "Outpatient Medical Prescription (Rx)",
            metaPairs: [
              ["UHID", visit.uhid], ["Patient", visit.patientName],
              ["Doctor", visit.doctorName], ["Date", todayISO()],
              ["Diagnosis", fd.get("icdDiagnosis")], ["Follow-Up", fd.get("followUpDate") || "As advised"]
            ],
            bodyHtml: `
              <p><strong>Clinical Notes:</strong> ${esc(fd.get("clinicalNotes"))}</p>
              <table class="print-table"><thead><tr><th>Medicine</th><th>Frequency</th><th>Days</th><th>Qty</th></tr></thead>
              <tbody>${rxItems.map((r) => `<tr><td>${esc(r.medName)}</td><td>${esc(r.freq)}</td><td>${r.days}</td><td>${r.qty}</td></tr>`).join("")}</tbody></table>
              <p style="margin-top:10px;"><strong>Advice:</strong> ${esc(fd.get("advice"))}</p>
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
  const ips = (await db.list("ip_admissions")).filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient Ward Rounds &amp; Progress Notes</h2><p>Record daily physician round notes and inpatient treatment orders.</p></div></div>
    <div class="card">
      <form id="round-form" class="form-grid">
        <div class="form-group"><label>Inpatient *</label><select name="ipId" required>${ips.map((i) => `<option value="${esc(i.id)}">${esc(i.roomNo)} — ${esc(i.patientName)}</option>`).join("") || `<option value="">No admitted patients</option>`}</select></div>
        <div class="form-group form-span-2"><label>Progress Note &amp; Orders *</label><input name="note" required placeholder="Afebrile, vitals stable, continue IV antibiotics" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary" ${ips.length ? "" : "disabled"}>Add Round Note</button></div>
      </form>
    </div>
    <div class="card"><div id="rounds-tbl"></div></div>
  `;
  const rounds = await db.list("ip_rounds");
  mountDataTable(container.querySelector("#rounds-tbl"), {
    columns: [
      { key: "date", label: "Date/Time" },
      { key: "ipId", label: "IP No" },
      { key: "patientName", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "note", label: "Progress Note" }
    ],
    rows: rounds
  });
  container.querySelector("#round-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ip = ips.find((i) => i.id === fd.get("ipId"));
    await db.add("ip_rounds", {
      date: new Date().toLocaleString(),
      ipId: ip.id,
      patientName: ip.patientName,
      doctor: auth.getCurrentUser().fullName,
      note: fd.get("note")
    });
    toast("Ward round note saved.", "success");
    renderIpRounds(container);
  };
}

async function renderDaycare(container) {
  const [patients, daycare] = await Promise.all([db.list("patients"), db.list("daycare_logs")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Daycare Observation &amp; Minor Procedures</h2><p>Short-stay infusions, wound dressings, nebulization, and observation records.</p></div></div>
    <div class="card">
      <form id="dc-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Procedure / Observation</label><input name="procedure" required placeholder="e.g. IV Iron Sucrose Infusion" /></div>
        <div class="form-group"><label>Duration (Hrs)</label><input name="hours" type="number" value="3" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Admit to Daycare</button></div>
      </form>
    </div>
    <div class="card"><div id="dc-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#dc-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "procedure", label: "Procedure" },
      { key: "hours", label: "Duration (Hrs)" }
    ],
    rows: daycare
  });
  container.querySelector("#dc-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    await db.add("daycare_logs", { date: todayISO(), uhid: pat.uhid, patientName: pat.fullName, procedure: fd.get("procedure"), hours: fd.get("hours") });
    toast("Daycare entry logged.", "success");
    renderDaycare(container);
  };
}

async function renderDietManagement(container) {
  const ips = (await db.list("ip_admissions")).filter((i) => i.status === "Admitted");
  container.innerHTML = `
    <div class="module-header"><div><h2>Inpatient Therapeutic Diet Management</h2><p>Prescribe patient-specific diets coordinated with hospital kitchen.</p></div></div>
    <div class="card"><div id="diet-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#diet-tbl"), {
    columns: [
      { key: "id", label: "IP No" },
      { key: "roomNo", label: "Bed" },
      { key: "patientName", label: "Patient" },
      { key: "diagnosis", label: "Diagnosis" },
      { key: "diet", label: "Prescribed Diet" },
      {
        key: "act",
        label: "Update Diet",
        noExport: true,
        render: (i) => `<button class="btn btn-sm btn-primary" data-diet="${esc(i.id)}">Change Diet</button>`
      }
    ],
    rows: ips
  });
  container.querySelector("#diet-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-diet]");
    if (!btn) return;
    const ip = ips.find((x) => x.id === btn.dataset.diet);
    openModal({
      title: `Prescribe Diet: ${ip.patientName}`,
      bodyHtml: `
        <form id="diet-chg-form" class="form-grid">
          <div class="form-group form-span-2"><label>Therapeutic Diet</label><select name="diet"><option>Normal Hospital Diet</option><option>Diabetic Low-Salt Soft Diet</option><option>Renal Low-Potassium Diet</option><option>Liquid / Clear Fluids</option><option>NPO (Nil Per Oral)</option></select></div>
          <div class="form-actions"><button type="submit" class="btn btn-primary">Update Kitchen Order</button></div>
        </form>
      `,
      onMount: (slot) => {
        slot.querySelector("#diet-chg-form").onsubmit = async (ev) => {
          ev.preventDefault();
          await db.update("ip_admissions", ip.id, { diet: new FormData(ev.target).get("diet") });
          toast("Diet order updated.", "success");
          closeModal();
          renderDietManagement(container);
        };
      }
    });
  };
}

async function renderPatientHistory(container) {
  const [patients, visits, ips, labs] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("ip_admissions"),
    db.list("lab_orders")
  ]);

  container.innerHTML = `
    <div class="module-header"><div><h2>Longitudinal Patient Medical History</h2><p>Unified clinical timeline of OP visits, IP stays, diagnoses, allergies, and lab results.</p></div></div>
    <div class="card">
      <div class="form-group" style="max-width:420px;">
        <label>Select Patient</label>
        <select id="hist-pat-sel">
          ${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div id="hist-timeline"></div>
  `;

  const sel = container.querySelector("#hist-pat-sel");
  const renderTimeline = () => {
    const uhid = sel.value;
    const pat = patients.find((p) => p.uhid === uhid);
    if (!pat) return;
    const pVisits = visits.filter((v) => v.uhid === uhid);
    const pIps = ips.filter((i) => i.uhid === uhid);
    const pLabs = labs.filter((l) => l.uhid === uhid);

    container.querySelector("#hist-timeline").innerHTML = `
      <div class="card">
        <h3 class="card-title">${esc(pat.fullName)} (${esc(pat.uhid)}) — ${esc(pat.age)}y ${esc(pat.gender)} | Blood: ${esc(pat.bloodGroup)}</h3>
        <div class="alert ${pat.allergies && pat.allergies !== "None" ? "alert-error" : "alert-info"}"><strong>Allergies:</strong> ${esc(pat.allergies || "None")}</div>
        <h4>OP Consultations (${pVisits.length})</h4>
        <ul>${pVisits.map((v) => `<li><strong>${esc(v.visitDate)}</strong> — ${esc(v.doctorName)} | Dx: ${esc(v.diagnosis || "Pending")} | Notes: ${esc(v.clinicalNotes || "-")}</li>`).join("") || "<li>No OP visits</li>"}</ul>
        <h4>Inpatient Admissions (${pIps.length})</h4>
        <ul>${pIps.map((i) => `<li><strong>${esc(i.admitDate)}</strong> (${esc(i.id)}) — ${esc(i.diagnosis)} [${esc(i.status)}]</li>`).join("") || "<li>No IP admissions</li>"}</ul>
        <h4>Diagnostic Lab Results (${pLabs.length})</h4>
        <ul>${pLabs.map((l) => `<li><strong>${esc(l.orderDate)}</strong> — ${esc(l.testName)}: <strong>${esc(l.resultValue || "Pending")}</strong> (${esc(l.normalRange)})</li>`).join("") || "<li>No lab orders</li>"}</ul>
      </div>
    `;
  };
  sel.onchange = renderTimeline;
  renderTimeline();
}

async function renderObgRegister(container, title, colName, fields) {
  const rows = await db.list(colName);
  container.innerHTML = `
    <div class="module-header"><div><h2>${esc(title)}</h2><p>Statutory clinical &amp; obstetric tracking register.</p></div></div>
    <div class="card">
      <form id="obg-form" class="form-grid">
        ${fields.map((f) => `<div class="form-group"><label>${esc(f.label)} *</label><input name="${esc(f.name)}" type="${f.type || "text"}" required /></div>`).join("")}
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add Record</button></div>
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
    const obj = {};
    fields.forEach((f) => { obj[f.name] = fd.get(f.name); });
    await db.add(colName, obj);
    toast("Record saved.", "success");
    renderObgRegister(container, title, colName, fields);
  };
}

async function renderReviewBooking(container) {
  const [patients, doctors] = await Promise.all([db.list("patients"), db.list("doctors")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Doctor Review / Follow-Up Appointment</h2><p>Schedule follow-up visits directly from the physician screen.</p></div></div>
    <div class="card">
      <form id="rev-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} - ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Doctor</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Review Date</label><input name="date" type="date" value="${todayISO()}" required /></div>
        <div class="form-group"><label>Notes</label><input name="notes" value="Post-treatment review" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Schedule Review</button></div>
      </form>
    </div>
  `;
  container.querySelector("#rev-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pat = patients.find((p) => p.uhid === fd.get("uhid"));
    await db.add("appointments", { uhid: pat.uhid, patientName: pat.fullName, doctorName: fd.get("doctorName"), date: fd.get("date"), slot: "11:00", notes: fd.get("notes"), status: "Review Scheduled" });
    toast("Review appointment booked.", "success");
  };
}
