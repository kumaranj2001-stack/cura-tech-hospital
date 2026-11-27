/**
 * Laboratory Information System (LIS): Dashboard, Sample Accessioning & Result Sign-Off,
 * External Lab Outsourcing, Auto-Uploaded Analyzer Results, TAT Analytics, Reagent Stock & Test Catalog.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, openModal, closeModal, toast } from "../ui.js";
import { printA4Document } from "../print.js";
import { renderBarcodeSVG } from "../barcode.js";

export async function renderLabView(viewId, container, params = {}) {
  switch (viewId) {
    case "lab_dashboard":
      return renderLabDashboard(container);
    case "lab_orders":
    case "lab_pending":
    case "lab_edit_results":
    case "lab_external_diag":
    case "lab_external_orders":
    case "lab_ext_pending":
      return renderLabWorklist(container, viewId);
    case "lab_auto_results":
      return renderAutoUploadedResults(container);
    case "lab_eod_report":
    case "lab_ext_report":
    case "lab_scan_report":
    case "lab_tat_report":
      return renderLabAnalytics(container, viewId);
    case "lab_stock_purchase":
    case "lab_po_manage":
    case "lab_stock_report":
    case "lab_inventory_mgmt":
    case "lab_pending_payments":
      return renderLabInventory(container, viewId, params);
    case "lab_test_catalog":
      return renderTestCatalog(container, params.category || "Bloodtest");
    default:
      return renderLabDashboard(container);
  }
}

async function renderLabDashboard(container) {
  const orders = await db.list("lab_orders");
  const pending = orders.filter((o) => o.status !== "Verified").length;
  const verified = orders.filter((o) => o.status === "Verified").length;
  const external = orders.filter((o) => o.source === "External").length;

  container.innerHTML = `
    <div class="module-header"><div><h2>Laboratory Information System (LIS) Dashboard</h2><p>Daily sample accessioning, pending test queues, analyzer feeds, and pathologist verification.</p></div></div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Lab Orders</div><div class="kpi-value">${orders.length}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Pending Tests</div><div class="kpi-value">${pending}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Verified Reports</div><div class="kpi-value">${verified}</div></div>
      <div class="kpi-card cyan"><div class="kpi-label">External Outsourced</div><div class="kpi-value">${external}</div></div>
    </div>
    <div class="card"><div id="lab-dash-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lab-dash-tbl"), {
    columns: [
      { key: "id", label: "Order ID" },
      { key: "orderDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "testName", label: "Investigation" },
      { key: "source", label: "Lab Source" },
      { key: "status", label: "Status", render: (o) => `<span class="badge ${o.status === "Verified" ? "badge-green" : "badge-amber"}">${esc(o.status)}</span>` }
    ],
    rows: orders
  });
}

async function renderLabWorklist(container, viewId) {
  const orders = await db.list("lab_orders");
  const isExt = viewId.includes("ext");
  const onlyPending = viewId.includes("pending");
  const rows = orders.filter((o) => {
    if (isExt && o.source !== "External") return false;
    if (onlyPending && o.status === "Verified") return false;
    return true;
  });

  container.innerHTML = `
    <div class="module-header"><div><h2>${isExt ? "External Outsourced Lab" : "Internal Diagnostics"} Worklist</h2><p>Accession samples, enter results, sign off reports, and print barcode labels.</p></div></div>
    <div class="card"><div id="lab-work-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#lab-work-tbl"), {
    columns: [
      { key: "id", label: "Sample ID" },
      { key: "orderDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "category", label: "Category" },
      { key: "testName", label: "Test" },
      { key: "resultValue", label: "Result", render: (o) => o.resultValue ? `<strong>${esc(o.resultValue)}</strong> ${esc(o.unit || "")}` : "-" },
      { key: "status", label: "Status", render: (o) => `<span class="badge ${o.status === "Verified" ? "badge-green" : "badge-amber"}">${esc(o.status)}</span>` },
      {
        key: "act",
        label: "Actions",
        noExport: true,
        render: (o) => `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm btn-primary" data-res="${esc(o.id)}">${o.status === "Verified" ? "Edit Result" : "Enter Result"}</button>
            ${o.status === "Verified" ? `<button class="btn btn-sm" data-prt="${esc(o.id)}">Print Report</button>` : ""}
          </div>
        `
      }
    ],
    rows
  });

  container.querySelector("#lab-work-tbl").onclick = async (e) => {
    const resBtn = e.target.closest("button[data-res]");
    const prtBtn = e.target.closest("button[data-prt]");

    if (resBtn) {
      const ord = orders.find((o) => o.id === resBtn.dataset.res);
      openModal({
        title: `Enter Lab Result: ${ord.testName} (${ord.id})`,
        bodyHtml: `
          <div style="margin-bottom:10px;">${renderBarcodeSVG(ord.id, 30)}</div>
          <form id="lab-res-form" class="form-grid">
            <div class="form-group"><label>Result Value *</label><input name="resultValue" value="${esc(ord.resultValue)}" required placeholder="Enter observed value" /></div>
            <div class="form-group"><label>Normal Reference</label><input value="${esc(ord.normalRange)} ${esc(ord.unit)}" readonly /></div>
            <div class="form-group form-span-2"><label>Pathologist / Technician Remarks</label><input name="remarks" value="${esc(ord.remarks || "Within acceptable range / Correlate clinically")}" /></div>
            <div class="form-actions"><button type="submit" class="btn btn-success">Verify &amp; Sign Off Report</button></div>
          </form>
        `,
        onMount: (slot) => {
          slot.querySelector("#lab-res-form").onsubmit = async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            await db.update("lab_orders", ord.id, {
              resultValue: fd.get("resultValue"),
              remarks: fd.get("remarks"),
              status: "Verified",
              verifiedBy: auth.getCurrentUser().username,
              verifiedAt: new Date().toISOString()
            });
            toast(`Result verified for ${ord.id}.`, "success");
            closeModal();
            renderLabWorklist(container, viewId);
          };
        }
      });
    } else if (prtBtn) {
      const ord = orders.find((o) => o.id === prtBtn.dataset.prt);
      await printA4Document({
        docTitle: "Diagnostic Laboratory Report",
        metaPairs: [
          ["Sample ID", ord.id], ["Order Date", ord.orderDate],
          ["UHID", ord.uhid], ["Patient Name", ord.patientName],
          ["Referring Doctor", ord.doctorName], ["Category", ord.category]
        ],
        bodyHtml: `
          <table class="print-table">
            <thead><tr><th>Test Name</th><th>Observed Value</th><th>Unit</th><th>Reference Range</th></tr></thead>
            <tbody><tr><td>${esc(ord.testName)}</td><td><strong>${esc(ord.resultValue)}</strong></td><td>${esc(ord.unit)}</td><td>${esc(ord.normalRange)}</td></tr></tbody>
          </table>
          <p style="margin-top:10px;"><strong>Remarks:</strong> ${esc(ord.remarks)}</p>
        `,
        signatureLabel: `Verified By: ${ord.verifiedBy || "Pathologist"}`
      });
    }
  };
}

async function renderAutoUploadedResults(container) {
  const orders = (await db.list("lab_orders")).filter((o) => o.status !== "Verified");
  container.innerHTML = `
    <div class="module-header"><div><h2>Auto-Uploaded Analyzer Interface</h2><p>Ingest bi-directional Mindray / Sysmex analyzer payloads and auto-populate pending orders.</p></div></div>
    <div class="card">
      <p>Pending orders awaiting analyzer ingestion: <strong>${orders.length}</strong></p>
      <button type="button" class="btn btn-primary" id="btn-sim-hl7" ${orders.length ? "" : "disabled"}>Simulate Analyzer Batch Sync</button>
    </div>
  `;
  container.querySelector("#btn-sim-hl7").onclick = async () => {
    for (const o of orders) {
      await db.update("lab_orders", o.id, {
        resultValue: o.normalRange.split("-")[0]?.trim() || "Normal",
        remarks: "Auto-ingested via LIS Analyzer Interface",
        status: "Verified",
        verifiedBy: "AUTO-ANALYZER",
        verifiedAt: new Date().toISOString()
      });
    }
    toast(`Auto-uploaded ${orders.length} analyzer result(s)!`, "success");
    renderAutoUploadedResults(container);
  };
}

async function renderLabAnalytics(container, viewId) {
  const orders = await db.list("lab_orders");
  const titleMap = {
    lab_eod_report: "Lab End-Of-Day (EOD) Summary",
    lab_ext_report: "External Outsourced Lab Report",
    lab_scan_report: "Scan & Imaging Diagnosis Report",
    lab_tat_report: "Laboratory Turnaround Time (TAT) Audit"
  };
  let rows = orders;
  if (viewId === "lab_ext_report") rows = orders.filter((o) => o.source === "External");
  if (viewId === "lab_scan_report") rows = orders.filter((o) => o.category === "Scan Type" || o.category === "XRay Type");

  container.innerHTML = `
    <div class="module-header"><div><h2>${esc(titleMap[viewId] || "Lab Report")}</h2></div></div>
    <div class="card"><div id="lab-ana-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lab-ana-tbl"), {
    columns: [
      { key: "id", label: "Sample ID" },
      { key: "orderDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "category", label: "Category" },
      { key: "testName", label: "Test" },
      { key: "price", label: "Tariff", render: (o) => money(o.price) },
      { key: "status", label: "Status" },
      { key: "tat", label: "SLA Target", value: () => "Within 2-4 Hrs", render: () => `<span class="badge badge-green">Within SLA</span>` }
    ],
    rows,
    exportFileName: `${viewId}.csv`,
    printTitle: titleMap[viewId]
  });
}

async function renderLabInventory(container, viewId) {
  const reagents = await db.list("lab_reagents");
  container.innerHTML = `
    <div class="module-header"><div><h2>Laboratory Reagent Stock &amp; Procurement</h2><p>Track reagent lots, expiry dates, purchase orders, and vendor dues.</p></div></div>
    <div class="card">
      <form id="reag-form" class="form-grid">
        <div class="form-group"><label>Reagent / Kit Name *</label><input name="name" required placeholder="e.g. CBC Diluent 20L" /></div>
        <div class="form-group"><label>Lot Number *</label><input name="lotNo" required placeholder="LOT-26A" /></div>
        <div class="form-group"><label>Expiry Date *</label><input name="expiry" type="date" value="2027-10-31" required /></div>
        <div class="form-group"><label>Qty</label><input name="qty" type="number" value="10" required /></div>
        <div class="form-group"><label>Vendor Cost (₹)</label><input name="cost" type="number" value="3200" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add Reagent Stock</button></div>
      </form>
    </div>
    <div class="card"><div id="reag-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#reag-tbl"), {
    columns: [
      { key: "name", label: "Reagent" },
      { key: "lotNo", label: "Lot No" },
      { key: "expiry", label: "Expiry" },
      { key: "qty", label: "Available Qty" },
      { key: "cost", label: "Unit Cost", render: (r) => money(r.cost) }
    ],
    rows: reagents,
    exportFileName: "lab-reagents.csv"
  });
  container.querySelector("#reag-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("lab_reagents", {
      name: fd.get("name"),
      lotNo: fd.get("lotNo"),
      expiry: fd.get("expiry"),
      qty: Number(fd.get("qty")),
      cost: Number(fd.get("cost"))
    });
    toast("Reagent lot added.", "success");
    renderLabInventory(container, viewId);
  };
}

async function renderTestCatalog(container, category) {
  const tests = (await db.list("lab_tests_master")).filter((t) => t.category === category);
  container.innerHTML = `
    <div class="module-header"><div><h2>Test Master Catalog: ${esc(category)}</h2><p>Manage diagnostic templates, units, normal reference ranges, TAT, and fees.</p></div></div>
    <div class="card">
      <form id="tst-cat-form" class="form-grid">
        <div class="form-group"><label>Test Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Unit</label><input name="unit" value="mg/dL" /></div>
        <div class="form-group"><label>Normal Range</label><input name="normalRange" required placeholder="e.g. 70 - 110" /></div>
        <div class="form-group"><label>Price (₹)</label><input name="price" type="number" value="300" required /></div>
        <div class="form-group"><label>TAT (Hours)</label><input name="tatHours" type="number" value="2" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add ${esc(category)}</button></div>
      </form>
    </div>
    <div class="card"><div id="tst-cat-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#tst-cat-tbl"), {
    columns: [
      { key: "name", label: "Test Name" },
      { key: "unit", label: "Unit" },
      { key: "normalRange", label: "Normal Range" },
      { key: "tatHours", label: "TAT (Hrs)" },
      { key: "price", label: "Tariff", render: (t) => money(t.price) }
    ],
    rows: tests
  });
  container.querySelector("#tst-cat-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("lab_tests_master", {
      category,
      name: fd.get("name"),
      unit: fd.get("unit"),
      normalRange: fd.get("normalRange"),
      price: Number(fd.get("price")),
      tatHours: Number(fd.get("tatHours"))
    });
    toast(`${category} test added.`, "success");
    renderTestCatalog(container, category);
  };
}
