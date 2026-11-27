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
      <div class="kpi-card"><div class="kpi-label">External Outsourced</div><div class="kpi-value">${external}</div></div>
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
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" data-res="${esc(o.id)}">${o.status === "Verified" ? "Edit Result" : "Enter Result"}</button>
            <button class="btn btn-sm" data-pr="${esc(o.id)}">Print Report</button>
          </div>
        `
      }
    ],
    rows
  });

  container.querySelector("#lab-work-tbl").onclick = async (e) => {
    const resBtn = e.target.closest("button[data-res]");
    const prBtn = e.target.closest("button[data-pr]");

    if (resBtn) {
      const ord = orders.find((o) => o.id === resBtn.dataset.res);
      openModal({
        title: `Lab Result Entry: ${ord.testName} (${ord.id})`,
        bodyHtml: `
          <div style="margin-bottom:10px;">${renderBarcodeSVG(ord.id, 30)}</div>
          <form id="lab-res-form" class="form-grid">
            <div class="form-group"><label>Result Value *</label><input name="resultValue" value="${esc(ord.resultValue || "")}" required /></div>
            <div class="form-group"><label>Normal Reference Range</label><input name="normalRange" value="${esc(ord.normalRange || "-")}" /></div>
            <div class="form-group form-span-2"><label>Pathologist / Technician Remarks</label><input name="remarks" value="${esc(ord.remarks || "Verified against QC control")}" /></div>
            <div class="form-actions"><button type="submit" class="btn btn-success">Verify &amp; Sign Off Report</button></div>
          </form>
        `,
        onMount: (slot) => {
          slot.querySelector("#lab-res-form").onsubmit = async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            await db.update("lab_orders", ord.id, {
              resultValue: fd.get("resultValue"),
              normalRange: fd.get("normalRange"),
              remarks: fd.get("remarks"),
              status: "Verified",
              verifiedBy: auth.getCurrentUser().username,
              verifiedAt: new Date().toISOString()
            });
            toast(`Report ${ord.id} verified & signed off.`, "success");
            closeModal();
            renderLabWorklist(container, viewId);
          };
        }
      });
    } else if (prBtn) {
      const ord = orders.find((o) => o.id === prBtn.dataset.pr);
      await printA4Document({
        docTitle: "Laboratory Investigation Report",
        metaPairs: [["Sample ID", ord.id], ["UHID", ord.uhid], ["Patient", ord.patientName], ["Order Date", ord.orderDate], ["Category", ord.category], ["Status", ord.status]],
        bodyHtml: `
          <table class="print-table">
            <thead><tr><th>Test Name</th><th>Observed Value</th><th>Units</th><th>Normal Range</th></tr></thead>
            <tbody><tr><td>${esc(ord.testName)}</td><td><strong>${esc(ord.resultValue || "Pending")}</strong></td><td>${esc(ord.unit || "-")}</td><td>${esc(ord.normalRange || "-")}</td></tr></tbody>
          </table>
          <p><strong>Remarks:</strong> ${esc(ord.remarks || "-")}</p>
        `,
        signatureLabel: `Pathologist / Lab Sign-Off (${ord.verifiedBy || "Lab Tech"})`
      });
    }
  };
}

async function renderAutoUploadedResults(container) {
  const orders = (await db.list("lab_orders")).filter((o) => o.status !== "Verified");
  container.innerHTML = `
    <div class="module-header">
      <div><h2>Bi-Directional Analyzer Auto-Uploaded Results</h2><p>Ingest HL7/ASTM JSON analyzer payloads or simulate instrument interface result matching.</p></div>
      <div class="module-actions"><button class="btn btn-primary" id="btn-sim-hl7">Simulate Analyzer Feed</button></div>
    </div>
    <div class="card"><div id="auto-res-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#auto-res-tbl"), {
    columns: [{ key: "id", label: "Sample ID" }, { key: "patientName", label: "Patient" }, { key: "testName", label: "Test" }, { key: "resultValue", label: "Result" }, { key: "status", label: "Status" }],
    rows: orders,
    emptyText: "No pending samples awaiting analyzer upload."
  });
  container.querySelector("#btn-sim-hl7").onclick = async () => {
    if (!orders.length) return toast("All lab orders are already verified.", "info");
    await db.update("lab_orders", orders[0].id, {
      resultValue: "13.4 g/dL (Analyzer Auto-Feed)",
      status: "Verified",
      verifiedBy: "HL7-Analyzer-Bridge",
      verifiedAt: new Date().toISOString()
    });
    toast(`Analyzer ingested result for ${orders[0].id}.`, "success");
    renderAutoUploadedResults(container);
  };
}

async function renderLabAnalytics(container, viewId) {
  const orders = await db.list("lab_orders");
  let rows = orders;
  if (viewId === "lab_ext_report") rows = orders.filter((o) => o.source === "External");
  if (viewId === "lab_scan_report") rows = orders.filter((o) => o.category === "Scan Type" || o.category === "XRay Type");

  container.innerHTML = `
    <div class="module-header"><div><h2>Laboratory Report &amp; TAT Analytics</h2></div></div>
    <div class="card"><div id="lab-rep-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lab-rep-tbl"), {
    columns: [
      { key: "id", label: "Order ID" },
      { key: "orderDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "category", label: "Category" },
      { key: "testName", label: "Test" },
      { key: "price", label: "Tariff", render: (r) => money(r.price) },
      { key: "tatTargetHours", label: "TAT Target (hrs)" },
      { key: "status", label: "Status" }
    ],
    rows,
    exportFileName: `${viewId}.csv`,
    printTitle: `See Curavite — ${viewId.replace(/_/g, " ").toUpperCase()}`
  });
}

async function renderLabInventory(container, viewId) {
  if (viewId === "lab_inventory_mgmt") {
    auth.requirePermission("manage_inventory_settings", "manage lab inventory thresholds and lots");
  }
  const items = await db.list("lab_inventory");
  container.innerHTML = `
    <div class="module-header"><div><h2>Lab Reagent Stock &amp; Purchase Management</h2></div></div>
    <div class="card">
      <form id="lab-inv-form" class="form-grid">
        <div class="form-group"><label>Reagent / Kit Name *</label><input name="name" required placeholder="e.g. CBC Diluent 20L" /></div>
        <div class="form-group"><label>Lot / Batch No *</label><input name="lotNo" required /></div>
        <div class="form-group"><label>Expiry Date</label><input name="expiry" type="date" value="2027-12-31" /></div>
        <div class="form-group"><label>Quantity</label><input name="qty" type="number" min="1" value="10" required /></div>
        <div class="form-group"><label>Vendor Cost (₹)</label><input name="cost" type="number" value="1800" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Save Lab Stock Entry</button></div>
      </form>
    </div>
    <div class="card"><div id="lab-inv-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lab-inv-tbl"), {
    columns: [
      { key: "name", label: "Reagent / Kit" },
      { key: "lotNo", label: "Lot No" },
      { key: "expiry", label: "Expiry" },
      { key: "qty", label: "Qty" },
      { key: "cost", label: "Cost", render: (r) => money(r.cost) }
    ],
    rows: items,
    exportFileName: "lab-inventory.csv"
  });
  container.querySelector("#lab-inv-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("lab_inventory", {
      name: fd.get("name"),
      lotNo: fd.get("lotNo"),
      expiry: fd.get("expiry"),
      qty: Number(fd.get("qty")),
      cost: Number(fd.get("cost"))
    });
    toast("Lab reagent stock saved.", "success");
    renderLabInventory(container, viewId);
  };
}

async function renderTestCatalog(container, category) {
  const tests = (await db.list("lab_tests")).filter((t) => t.category === category);
  const canEdit = auth.hasPermission("manage_inventory_settings") || auth.isAdmin();

  container.innerHTML = `
    <div class="module-header"><div><h2>Test Maintenance Catalog: ${esc(category)}</h2><p>Manage diagnostic test templates, units, normal reference ranges, and tariff prices.</p></div></div>
    ${canEdit ? `
    <div class="card">
      <form id="lt-add-form" class="form-grid">
        <div class="form-group"><label>Test Code *</label><input name="code" required /></div>
        <div class="form-group"><label>Test Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Unit</label><input name="unit" value="mg/dL" /></div>
        <div class="form-group"><label>Normal Range</label><input name="normalRange" value="Normal" /></div>
        <div class="form-group"><label>Price (₹)</label><input name="price" type="number" value="350" required /></div>
        <div class="form-group"><label>TAT (Hours)</label><input name="tatHours" type="number" value="4" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">+ Add ${esc(category)} Test</button></div>
      </form>
    </div>` : `<div class="alert alert-info">View-only catalog. Editing master test prices requires Admin/Inventory Settings permission.</div>`}
    <div class="card"><div id="lt-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#lt-tbl"), {
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Test Name" },
      { key: "unit", label: "Unit" },
      { key: "normalRange", label: "Reference Range" },
      { key: "price", label: "Price", render: (t) => money(t.price) },
      { key: "tatHours", label: "TAT (h)" }
    ],
    rows: tests
  });
  if (canEdit) {
    container.querySelector("#lt-add-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("lab_tests", {
        category,
        code: fd.get("code"),
        name: fd.get("name"),
        unit: fd.get("unit"),
        normalRange: fd.get("normalRange"),
        price: Number(fd.get("price")),
        tatHours: Number(fd.get("tatHours"))
      });
      toast(`${category} test added to master catalog.`, "success");
      renderTestCatalog(container, category);
    };
  }
}
