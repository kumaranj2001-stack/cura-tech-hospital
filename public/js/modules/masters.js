/**
 * Maintenance Tab Master Catalog Engine
 * Manages all 22+ clinical & operational registries (Medicine, ICD Codes, Services, Insurance, etc.)
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, mountDataTable, toast } from "../ui.js";

export async function renderMasterCatalogView(catalogName, container) {
  auth.requirePermission("maintenance", `access ${catalogName} master catalog`);
  const canEdit = auth.hasPermission("manage_inventory_settings") || auth.isAdmin();

  if (catalogName === "Medicine") {
    return renderMedicineMaster(container, canEdit);
  }

  const allMasters = await db.list("masters");
  const rows = allMasters.filter((m) => m.catalog === catalogName);

  container.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Master Catalog: ${esc(catalogName)}</h2>
        <p>Standardized clinical &amp; operational registry used across See Curavite Hospital Management.</p>
      </div>
    </div>
    ${canEdit ? `
    <div class="card">
      <form id="master-add-form" class="form-grid">
        <div class="form-group"><label>Code / Short ID *</label><input name="code" required placeholder="e.g. CODE-01" /></div>
        <div class="form-group"><label>Name / Title *</label><input name="name" required placeholder="Enter ${esc(catalogName)} name" /></div>
        <div class="form-group form-span-2"><label>Details / Rate / Description</label><input name="details" placeholder="Optional details, tariff, or notes" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">+ Add to ${esc(catalogName)}</button></div>
      </form>
    </div>` : `<div class="alert alert-warn">View-only mode: Inventory &amp; Master settings require Admin permission.</div>`}
    <div class="card"><div id="master-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#master-tbl"), {
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "details", label: "Details / Specification" },
      {
        key: "act",
        label: "Remove",
        noExport: true,
        render: (r) => canEdit ? `<button class="btn btn-sm btn-danger" data-del="${esc(r.id)}">Delete</button>` : "-"
      }
    ],
    rows,
    exportFileName: `master-${catalogName.toLowerCase().replace(/\s+/g, "-")}.csv`
  });

  if (canEdit) {
    container.querySelector("#master-add-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("masters", {
        catalog: catalogName,
        code: fd.get("code"),
        name: fd.get("name"),
        details: fd.get("details")
      });
      toast(`${catalogName} entry added.`, "success");
      renderMasterCatalogView(catalogName, container);
    };
    container.querySelector("#master-tbl").onclick = async (e) => {
      const btn = e.target.closest("button[data-del]");
      if (!btn) return;
      await db.remove("masters", btn.dataset.del);
      toast("Master item removed.", "warn");
      renderMasterCatalogView(catalogName, container);
    };
  }
}

async function renderMedicineMaster(container, canEdit) {
  const meds = await db.list("medicines");
  container.innerHTML = `
    <div class="module-header"><div><h2>Medicine &amp; Inventory Master Catalog</h2><p>Manage drugs, HSN codes, GST slabs, batches, and pricing.</p></div></div>
    ${canEdit ? `
    <div class="card">
      <form id="med-master-form" class="form-grid">
        <div class="form-group"><label>Medicine Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Generic Name *</label><input name="generic" required /></div>
        <div class="form-group"><label>Type</label><select name="type"><option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Ointment</option></select></div>
        <div class="form-group"><label>Manufacturer</label><input name="manufacturer" required /></div>
        <div class="form-group"><label>HSN Code</label><input name="hsn" value="300490" /></div>
        <div class="form-group"><label>GST %</label><select name="gstPercent"><option value="5">5%</option><option value="12" selected>12%</option><option value="18">18%</option></select></div>
        <div class="form-group"><label>MRP (₹)</label><input name="mrp" type="number" step="0.01" required /></div>
        <div class="form-group"><label>Purchase Rate (₹)</label><input name="purchaseRate" type="number" step="0.01" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">+ Save Medicine Master</button></div>
      </form>
    </div>` : `<div class="alert alert-warn">Only Admin or Inventory-permitted users can edit the Medicine Master catalog.</div>`}
    <div class="card"><div id="med-m-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#med-m-tbl"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "generic", label: "Generic" },
      { key: "type", label: "Type" },
      { key: "hsn", label: "HSN" },
      { key: "stock", label: "Stock" },
      { key: "mrp", label: "MRP" },
      { key: "gstPercent", label: "GST %" }
    ],
    rows: meds,
    exportFileName: "medicine-master.csv"
  });
  if (canEdit) {
    container.querySelector("#med-master-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("medicines", {
        name: fd.get("name"),
        generic: fd.get("generic"),
        type: fd.get("type"),
        manufacturer: fd.get("manufacturer"),
        hsn: fd.get("hsn"),
        gstPercent: Number(fd.get("gstPercent")),
        mrp: Number(fd.get("mrp")),
        purchaseRate: Number(fd.get("purchaseRate")),
        batchNo: "INIT",
        expiry: "2028-01-01",
        stock: 0,
        barcode: String(Date.now()).slice(-9)
      });
      toast("Medicine master created.", "success");
      renderMedicineMaster(container, canEdit);
    };
  }
}
