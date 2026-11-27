/**
 * Pharmacy Management Module: Rx Dispense, Counter POS, Sales Returns,
 * Purchase/GRN (with Admin Approval RBAC), Physical Stock Verification, GST & Audit Reports.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, openModal, closeModal, toast } from "../ui.js";
import { printThermalBill } from "../print.js";
import { queueOrSendNotification } from "../sms.js";

export async function renderPharmacyView(viewId, container, params = {}) {
  switch (viewId) {
    case "pharma_rx_dispense":
      return renderRxDispense(container);
    case "pharma_general_pos":
      return renderGeneralPos(container);
    case "pharma_sales_returns":
      return renderSalesReturns(container);
    case "pharma_pending_bills":
      return renderPendingBills(container);
    case "pharma_bill_tools":
      return renderBillTools(container, params.mode || "reprint");
    case "pharma_purchase":
    case "pharma_dc_purchase":
      return renderPurchaseGrn(container, viewId === "pharma_dc_purchase" ? "DC Purchase" : "Purchase");
    case "pharma_purchase_returns":
      return renderPurchaseReturns(container);
    case "pharma_stock_verify":
      return renderPhysicalStockVerification(container);
    case "pharma_stock_update":
      return renderManualStockUpdate(container);
    case "pharma_purchase_update":
    case "pharma_delete_purchase":
      return renderPurchaseListManage(container, viewId === "pharma_delete_purchase");
    case "pharma_orders":
      return renderPharmacyOrders(container, params.mode || "reorder");
    case "pharma_report":
      return renderPharmacyReport(container, params.report || "Sales Register");
    case "pharma_sales_reminder":
      return renderSalesReminders(container);
    default:
      return renderGeneralPos(container);
  }
}

async function renderRxDispense(container) {
  const [rxs, meds] = await Promise.all([db.list("prescriptions"), db.list("medicines")]);
  const pending = rxs.filter((r) => r.status !== "Dispensed");

  container.innerHTML = `
    <div class="module-header"><div><h2>Dispense Doctor E-Prescriptions</h2><p>Convert active outpatient e-prescriptions straight into pharmacy bills with batch &amp; GST calculation.</p></div></div>
    <div class="card"><div id="rx-disp-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#rx-disp-tbl"), {
    columns: [
      { key: "rxDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "items", label: "Medicines", render: (r) => (r.items || []).map((i) => `${esc(i.medName)} (${i.qty})`).join(", ") },
      { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "Dispensed" ? "badge-green" : "badge-amber"}">${esc(r.status)}</span>` },
      {
        key: "act",
        label: "Dispense",
        noExport: true,
        render: (r) => r.status !== "Dispensed"
          ? `<button class="btn btn-sm btn-success" data-disp="${esc(r.id)}">Dispense &amp; Bill</button>`
          : "Dispensed"
      }
    ],
    rows: pending.length ? pending : rxs,
    emptyText: "No e-prescriptions waiting."
  });

  container.querySelector("#rx-disp-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-disp]");
    if (!btn) return;
    const rx = rxs.find((x) => x.id === btn.dataset.disp);
    if (!rx) return;

    const billItems = [];
    let netTotal = 0;
    let totalGst = 0;

    for (const item of rx.items || []) {
      const med = meds.find((m) => m.id === item.medId || m.name === item.medName);
      const mrp = Number(med?.mrp || 50);
      const gstPct = Number(med?.gstPercent || 12);
      const amount = Number(item.qty) * mrp;
      const gstAmt = amount - amount / (1 + gstPct / 100);
      netTotal += amount;
      totalGst += gstAmt;
      billItems.push({
        medId: med?.id || item.medId,
        medName: item.medName,
        batchNo: med?.batchNo || "BATCH",
        qty: Number(item.qty),
        mrp,
        gstPercent: gstPct,
        amount
      });
      if (med) {
        await db.update("medicines", med.id, { stock: Math.max(0, Number(med.stock) - Number(item.qty)) });
      }
    }

    const billNo = await db.nextSequence("PHB");
    const subTotal = netTotal - totalGst;
    await db.add("pharmacy_sales", {
      id: billNo,
      billDate: todayISO(),
      uhid: rx.uhid,
      patientName: rx.patientName,
      saleType: "Prescription",
      items: billItems,
      subTotal,
      gstAmount: totalGst,
      discount: 0,
      netTotal,
      paymentMode: "Cash",
      status: "Paid",
      billedBy: auth.getCurrentUser().username
    });
    await db.update("prescriptions", rx.id, { status: "Dispensed", billNo });
    toast(`Dispensed Rx into Pharmacy Bill ${billNo}!`, "success");
    await printThermalBill({
      title: "PHARMACY RX RECEIPT",
      billNo,
      billDate: todayISO(),
      patientName: rx.patientName,
      uhid: rx.uhid,
      items: billItems,
      subTotal,
      gstAmount: totalGst,
      discount: 0,
      netTotal,
      paymentMode: "Cash",
      cashier: auth.getCurrentUser().username
    });
    renderRxDispense(container);
  };
}

async function renderGeneralPos(container) {
  const [meds, patients] = await Promise.all([db.list("medicines"), db.list("patients")]);
  const cart = [];

  container.innerHTML = `
    <div class="module-header">
      <div><h2>Pharmacy Counter POS Billing</h2><p>Fast medicine &amp; barcode billing with automatic GST tax calculation, batch selection, and 80mm thermal receipt.</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Add Medicine to Bill</h3>
        <div class="form-grid">
          <div class="form-group form-span-2">
            <label>Search / Scan Barcode or Medicine</label>
            <select id="pos-med-sel">
              ${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} | Batch: ${esc(m.batchNo)} | Exp: ${esc(m.expiry)} | Stock: ${m.stock} | ₹${m.mrp}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label>Qty</label><input id="pos-qty" type="number" min="1" value="1" /></div>
          <div class="form-actions" style="align-self:end;"><button type="button" class="btn btn-primary" id="pos-add-btn">+ Add Item</button></div>
        </div>
        <div style="margin-top:12px;" id="pos-cart-wrap"></div>
      </div>

      <div class="card">
        <h3 class="card-title">Invoice Checkout</h3>
        <form id="pos-checkout-form" class="form-grid">
          <div class="form-group form-span-2">
            <label>Patient (or Walk-in)</label>
            <select name="uhid" id="pos-pat-sel">
              <option value="WALKIN|Walk-in Customer">Walk-in Counter Customer</option>
              ${patients.map((p) => `<option value="${esc(p.uhid)}|${esc(p.fullName)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label>Discount (₹)</label><input name="discount" id="pos-disc" type="number" min="0" value="0" /></div>
          <div class="form-group"><label>Payment Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Hold as Pending</option></select></div>
          <div class="form-group form-span-2">
            <div id="pos-totals" class="alert alert-info">SubTotal: ₹0.00 | GST: ₹0.00 | Net Payable: ₹0.00</div>
          </div>
          <div class="form-actions form-span-2">
            <button type="submit" class="btn btn-success btn-block">Complete Sale &amp; Print 80mm Receipt</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const renderCart = () => {
    const disc = Number(container.querySelector("#pos-disc").value || 0);
    const gross = cart.reduce((s, c) => s + c.amount, 0);
    const gst = cart.reduce((s, c) => s + (c.amount - c.amount / (1 + c.gstPercent / 100)), 0);
    const sub = gross - gst;
    const net = Math.max(0, gross - disc);
    container.querySelector("#pos-totals").innerHTML = `SubTotal: <strong>${money(sub)}</strong> | GST: <strong>${money(gst)}</strong> | Net Payable: <strong>${money(net)}</strong>`;

    container.querySelector("#pos-cart-wrap").innerHTML = cart.length
      ? `<table class="data-table"><thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>MRP</th><th>Amt</th><th></th></tr></thead><tbody>
          ${cart.map((c, idx) => `<tr><td>${esc(c.medName)}</td><td>${esc(c.batchNo)}</td><td>${c.qty}</td><td>₹${c.mrp}</td><td>${money(c.amount)}</td><td><button type="button" class="btn btn-sm btn-danger" data-rm="${idx}">×</button></td></tr>`).join("")}
        </tbody></table>`
      : `<div style="color:var(--text-muted);font-size:12px;">Cart is empty. Add medicines from above.</div>`;
  };
  renderCart();

  container.querySelector("#pos-disc").oninput = renderCart;
  container.querySelector("#pos-add-btn").onclick = () => {
    const med = meds.find((m) => m.id === container.querySelector("#pos-med-sel").value);
    const qty = Number(container.querySelector("#pos-qty").value || 1);
    if (!med || qty <= 0) return;
    if (qty > Number(med.stock)) return toast(`Only ${med.stock} available in stock for ${med.name}.`, "error");
    cart.push({
      medId: med.id,
      medName: med.name,
      batchNo: med.batchNo,
      qty,
      mrp: Number(med.mrp),
      gstPercent: Number(med.gstPercent || 12),
      amount: qty * Number(med.mrp)
    });
    renderCart();
  };

  container.querySelector("#pos-cart-wrap").onclick = (e) => {
    const btn = e.target.closest("button[data-rm]");
    if (!btn) return;
    cart.splice(Number(btn.dataset.rm), 1);
    renderCart();
  };

  container.querySelector("#pos-checkout-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) return toast("Add at least one medicine to bill.", "warn");
    const fd = new FormData(e.target);
    const [uhid, patientName] = String(fd.get("uhid")).split("|");
    const disc = Number(fd.get("discount") || 0);
    const mode = fd.get("paymentMode");
    const isPending = mode === "Hold as Pending";
    const gross = cart.reduce((s, c) => s + c.amount, 0);
    const gstAmount = cart.reduce((s, c) => s + (c.amount - c.amount / (1 + c.gstPercent / 100)), 0);
    const netTotal = Math.max(0, gross - disc);
    const subTotal = gross - gstAmount;
    const billNo = await db.nextSequence("PHB");

    for (const c of cart) {
      const m = meds.find((x) => x.id === c.medId);
      if (m) await db.update("medicines", m.id, { stock: Math.max(0, Number(m.stock) - c.qty) });
    }

    await db.add("pharmacy_sales", {
      id: billNo,
      billDate: todayISO(),
      uhid,
      patientName,
      saleType: "General",
      items: cart,
      subTotal,
      gstAmount,
      discount: disc,
      netTotal,
      paymentMode: isPending ? "Pending" : mode,
      status: isPending ? "Pending" : "Paid",
      billedBy: auth.getCurrentUser().username
    });

    toast(`Pharmacy Bill ${billNo} completed!`, "success");
    await printThermalBill({
      title: "PHARMACY TAX INVOICE",
      billNo,
      billDate: todayISO(),
      patientName,
      uhid,
      items: cart,
      subTotal,
      gstAmount,
      discount: disc,
      netTotal,
      paymentMode: mode,
      cashier: auth.getCurrentUser().username
    });
    renderGeneralPos(container);
  };
}

async function renderSalesReturns(container) {
  const [sales, meds, returns] = await Promise.all([db.list("pharmacy_sales"), db.list("medicines"), db.list("pharmacy_sales_returns")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Customer Sales Returns</h2><p>Process returned medicines, refund net value, and restore batch stock.</p></div></div>
    <div class="card">
      <form id="sret-form" class="form-grid">
        <div class="form-group"><label>Original Bill No</label><select name="billNo">${sales.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} — ${esc(s.patientName)} (${money(s.netTotal)})</option>`).join("")}</select></div>
        <div class="form-group"><label>Returned Medicine</label><select name="medId">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (₹${m.mrp})</option>`).join("")}</select></div>
        <div class="form-group"><label>Return Qty</label><input name="qty" type="number" min="1" value="1" required /></div>
        <div class="form-group"><label>Reason</label><input name="reason" value="Unused / Dose Changed" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-warning">Process Sales Return</button></div>
      </form>
    </div>
    <div class="card"><div id="sret-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#sret-tbl"), {
    columns: [
      { key: "returnDate", label: "Date" },
      { key: "billNo", label: "Bill No" },
      { key: "medName", label: "Medicine" },
      { key: "qty", label: "Qty" },
      { key: "refundAmount", label: "Refund", render: (r) => money(r.refundAmount) },
      { key: "reason", label: "Reason" }
    ],
    rows: returns
  });
  container.querySelector("#sret-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const med = meds.find((m) => m.id === fd.get("medId"));
    const qty = Number(fd.get("qty"));
    await db.update("medicines", med.id, { stock: Number(med.stock || 0) + qty });
    await db.add("pharmacy_sales_returns", {
      returnDate: todayISO(),
      billNo: fd.get("billNo"),
      medName: med.name,
      qty,
      refundAmount: qty * Number(med.mrp),
      reason: fd.get("reason"),
      processedBy: auth.getCurrentUser().username
    });
    toast("Sales return processed & stock restored.", "success");
    renderSalesReturns(container);
  };
}

async function renderPendingBills(container) {
  const sales = (await db.list("pharmacy_sales")).filter((s) => s.status === "Pending");
  container.innerHTML = `
    <div class="module-header"><div><h2>Held &amp; Pending Pharmacy Bills</h2><p>Settle unpaid counter or inpatient pharmacy invoices.</p></div></div>
    <div class="card"><div id="pend-ph-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pend-ph-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "netTotal", label: "Amount", render: (s) => money(s.netTotal) },
      { key: "act", label: "Settle", noExport: true, render: (s) => `<button class="btn btn-sm btn-success" data-settle="${esc(s.id)}">Collect Cash/UPI</button>` }
    ],
    rows: sales,
    emptyText: "No pending pharmacy bills."
  });
  container.querySelector("#pend-ph-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-settle]");
    if (!btn) return;
    await db.update("pharmacy_sales", btn.dataset.settle, { status: "Paid", paymentMode: "Cash" });
    toast("Pharmacy bill settled.", "success");
    renderPendingBills(container);
  };
}

async function renderBillTools(container, mode) {
  if (mode === "void") auth.requirePermission("void_bills", "void pharmacy bills");
  const sales = await db.list("pharmacy_sales");
  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Bill ${mode === "void" ? "Void / Cancellation (Admin)" : "Search & Reprint"}</h2></div></div>
    <div class="card"><div id="ph-tools-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ph-tools-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "netTotal", label: "Net Total", render: (s) => money(s.netTotal) },
      { key: "status", label: "Status" },
      {
        key: "act",
        label: "Action",
        noExport: true,
        render: (s) => `
          <button class="btn btn-sm" data-reprint="${esc(s.id)}">Reprint</button>
          ${mode === "void" && s.status !== "Voided" ? `<button class="btn btn-sm btn-danger" data-void="${esc(s.id)}">Void</button>` : ""}
        `
      }
    ],
    rows: sales
  });
  container.querySelector("#ph-tools-tbl").onclick = async (e) => {
    const rep = e.target.closest("button[data-reprint]");
    const vd = e.target.closest("button[data-void]");
    if (rep) {
      const s = sales.find((x) => x.id === rep.dataset.reprint);
      await printThermalBill({ title: "PHARMACY DUPLICATE BILL", billNo: s.id, billDate: s.billDate, patientName: s.patientName, uhid: s.uhid, items: s.items, subTotal: s.subTotal, gstAmount: s.gstAmount, discount: s.discount, netTotal: s.netTotal, paymentMode: s.paymentMode, cashier: s.billedBy });
    } else if (vd) {
      await db.update("pharmacy_sales", vd.dataset.void, { status: "Voided" });
      await auth.logAudit("VOID_PHARMA_BILL", "Pharmacy", `Voided pharmacy bill ${vd.dataset.void}`);
      toast("Bill voided.", "warn");
      renderBillTools(container, mode);
    }
  };
}

async function renderPurchaseGrn(container, purchaseType) {
  const [meds, masters, purchases] = await Promise.all([db.list("medicines"), db.list("masters"), db.list("pharmacy_purchases")]);
  const suppliers = masters.filter((m) => m.catalog === "Supplier");
  const isAdmin = auth.hasPermission("approve_grn");

  container.innerHTML = `
    <div class="module-header">
      <div><h2>Pharmacy ${esc(purchaseType)} / GRN Stock Entry</h2><p>Enter supplier invoice, batch number, expiry, HSN, purchase rate, MRP, and GST slab.</p></div>
    </div>
    <div class="alert ${isAdmin ? "alert-info" : "alert-warn"}">
      ${isAdmin
        ? "<strong>Admin Privilege Active:</strong> You can post GRNs directly as Approved &amp; update live inventory."
        : "<strong>Staff Workflow Rule:</strong> Your GRN entries are saved as <strong>Pending Approval</strong>. An Admin must approve the GRN before quantities are added to live stock."}
    </div>
    <div class="card">
      <form id="grn-form" class="form-grid">
        <div class="form-group"><label>Supplier Invoice No *</label><input name="invoiceNo" required placeholder="INV-2026-..." /></div>
        <div class="form-group"><label>Supplier *</label><select name="supplier">${suppliers.map((s) => `<option>${esc(s.name)}</option>`).join("")}<option>Direct Manufacturer</option></select></div>
        <div class="form-group"><label>Medicine *</label><select name="medId">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Batch No *</label><input name="batchNo" required placeholder="B2601" /></div>
        <div class="form-group"><label>Expiry Date *</label><input name="expiry" type="date" value="2028-06-30" required /></div>
        <div class="form-group"><label>Qty *</label><input name="qty" type="number" min="1" value="50" required /></div>
        <div class="form-group"><label>Purchase Rate (₹) *</label><input name="rate" type="number" step="0.01" value="25" required /></div>
        <div class="form-group"><label>MRP (₹) *</label><input name="mrp" type="number" step="0.01" value="40" required /></div>
        <div class="form-group"><label>GST %</label><select name="gstPercent"><option value="5">5%</option><option value="12" selected>12%</option><option value="18">18%</option></select></div>
        <div class="form-actions" style="align-self:end;">
          <button type="submit" class="btn btn-primary">${isAdmin ? "Save &amp; Approve GRN" : "Submit GRN for Admin Approval"}</button>
        </div>
      </form>
    </div>
    <div class="card"><div id="grn-hist-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#grn-hist-tbl"), {
    columns: [
      { key: "id", label: "GRN ID" },
      { key: "grnDate", label: "Date" },
      { key: "type", label: "Type" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "supplier", label: "Supplier" },
      { key: "netTotal", label: "Net Total", render: (g) => money(g.netTotal) },
      { key: "status", label: "Approval Status", render: (g) => `<span class="badge ${g.status === "Approved" ? "badge-green" : "badge-amber"}">${esc(g.status)}</span>` }
    ],
    rows: purchases
  });

  container.querySelector("#grn-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const med = meds.find((m) => m.id === fd.get("medId"));
    const qty = Number(fd.get("qty"));
    const rate = Number(fd.get("rate"));
    const mrp = Number(fd.get("mrp"));
    const gstPct = Number(fd.get("gstPercent"));
    const subTotal = qty * rate;
    const gstAmount = subTotal * (gstPct / 100);
    const netTotal = subTotal + gstAmount;
    const grnId = await db.nextSequence("GRN");
    const status = isAdmin ? "Approved" : "Pending Approval";

    await db.add("pharmacy_purchases", {
      id: grnId,
      grnDate: todayISO(),
      invoiceNo: fd.get("invoiceNo"),
      supplier: fd.get("supplier"),
      type: purchaseType,
      items: [{ medId: med.id, medName: med.name, batchNo: fd.get("batchNo"), expiry: fd.get("expiry"), qty, rate, mrp, gstPercent: gstPct, total: netTotal }],
      subTotal,
      gstAmount,
      netTotal,
      status,
      enteredBy: auth.getCurrentUser().username,
      approvedBy: isAdmin ? auth.getCurrentUser().username : ""
    });

    if (isAdmin) {
      await db.update("medicines", med.id, {
        stock: Number(med.stock || 0) + qty,
        batchNo: fd.get("batchNo"),
        expiry: fd.get("expiry"),
        purchaseRate: rate,
        mrp
      });
      await auth.logAudit("APPROVE_GRN", "Pharmacy", `Admin saved & approved ${grnId}`);
      toast(`GRN ${grnId} approved and added to live stock!`, "success");
    } else {
      await auth.logAudit("DRAFT_GRN", "Pharmacy", `Staff submitted ${grnId} for Admin approval`);
      toast(`GRN ${grnId} saved as Pending Approval. Waiting for Admin approval.`, "warn");
    }
    renderPurchaseGrn(container, purchaseType);
  };
}

async function renderPurchaseReturns(container) {
  const [meds, masters] = await Promise.all([db.list("medicines"), db.list("masters")]);
  const suppliers = masters.filter((m) => m.catalog === "Supplier");
  const returns = await db.list("pharmacy_purchase_returns");
  container.innerHTML = `
    <div class="module-header"><div><h2>Supplier Purchase Returns (Debit Note)</h2><p>Return expired or damaged stock back to wholesale suppliers.</p></div></div>
    <div class="card">
      <form id="pret-form" class="form-grid">
        <div class="form-group"><label>Supplier</label><select name="supplier">${suppliers.map((s) => `<option>${esc(s.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Medicine</label><select name="medId">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (Stock: ${m.stock})</option>`).join("")}</select></div>
        <div class="form-group"><label>Qty</label><input name="qty" type="number" min="1" value="10" required /></div>
        <div class="form-group"><label>Reason</label><input name="reason" value="Near Expiry Return" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-warning">Record Purchase Return</button></div>
      </form>
    </div>
    <div class="card"><div id="pret-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pret-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "supplier", label: "Supplier" },
      { key: "medName", label: "Medicine" },
      { key: "qty", label: "Qty" },
      { key: "amount", label: "Debit Value", render: (r) => money(r.amount) },
      { key: "reason", label: "Reason" }
    ],
    rows: returns
  });
  container.querySelector("#pret-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const med = meds.find((m) => m.id === fd.get("medId"));
    const qty = Number(fd.get("qty"));
    await db.update("medicines", med.id, { stock: Math.max(0, Number(med.stock || 0) - qty) });
    await db.add("pharmacy_purchase_returns", {
      date: todayISO(),
      supplier: fd.get("supplier"),
      medName: med.name,
      qty,
      amount: qty * Number(med.purchaseRate || 0),
      reason: fd.get("reason")
    });
    toast("Supplier purchase return logged.", "success");
    renderPurchaseReturns(container);
  };
}

async function renderPhysicalStockVerification(container) {
  const meds = await db.list("medicines");
  container.innerHTML = `
    <div class="module-header"><div><h2>Physical Stock Verification &amp; Cycle Count</h2><p>Compare physical shelf counts with system stock and flag variances.</p></div></div>
    <div class="card"><div id="psv-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#psv-tbl"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "batchNo", label: "Batch" },
      { key: "expiry", label: "Expiry" },
      { key: "stock", label: "System Qty" },
      {
        key: "verify",
        label: "Physical Count",
        noExport: true,
        render: (m) => `<input type="number" style="width:78px;padding:3px;" value="${m.stock}" data-med-cnt="${esc(m.id)}" />`
      },
      {
        key: "act",
        label: "Reconcile",
        noExport: true,
        render: (m) => auth.hasPermission("manage_inventory_settings")
          ? `<button class="btn btn-sm btn-primary" data-rec="${esc(m.id)}">Update Stock</button>`
          : `<span class="badge badge-amber">Admin Only</span>`
      }
    ],
    rows: meds
  });
  container.querySelector("#psv-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-rec]");
    if (!btn) return;
    auth.requirePermission("manage_inventory_settings", "adjust physical inventory");
    const inp = container.querySelector(`input[data-med-cnt="${btn.dataset.rec}"]`);
    await db.update("medicines", btn.dataset.rec, { stock: Number(inp.value) });
    await auth.logAudit("STOCK_VERIFY", "Pharmacy", `Reconciled medicine ${btn.dataset.rec} to qty ${inp.value}`);
    toast("Stock count reconciled.", "success");
    renderPhysicalStockVerification(container);
  };
}

async function renderManualStockUpdate(container) {
  auth.requirePermission("manage_inventory_settings", "manage inventory stock settings");
  return renderPhysicalStockVerification(container);
}

async function renderPurchaseListManage(container, allowDelete) {
  if (allowDelete) auth.requirePermission("approve_grn", "delete GRN/purchase records");
  const purchases = await db.list("pharmacy_purchases");
  container.innerHTML = `
    <div class="module-header"><div><h2>${allowDelete ? "Delete Purchase Invoices (Admin)" : "Purchase Invoices Register"}</h2></div></div>
    <div class="card"><div id="pur-list-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pur-list-tbl"), {
    columns: [
      { key: "id", label: "GRN ID" },
      { key: "grnDate", label: "Date" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "supplier", label: "Supplier" },
      { key: "netTotal", label: "Total", render: (p) => money(p.netTotal) },
      { key: "status", label: "Status" },
      {
        key: "act",
        label: "Action",
        noExport: true,
        render: (p) => allowDelete ? `<button class="btn btn-sm btn-danger" data-del="${esc(p.id)}">Delete</button>` : "-"
      }
    ],
    rows: purchases
  });
  container.querySelector("#pur-list-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-del]");
    if (!btn) return;
    await db.remove("pharmacy_purchases", btn.dataset.del);
    await auth.logAudit("DELETE_PURCHASE", "Pharmacy", `Deleted purchase ${btn.dataset.del}`);
    toast("Purchase entry deleted.", "warn");
    renderPurchaseListManage(container, allowDelete);
  };
}

async function renderPharmacyOrders(container, mode) {
  const [meds, cfg] = await Promise.all([db.list("medicines"), db.getHospitalSettings()]);
  const lowMeds = meds.filter((m) => Number(m.stock) <= Number(cfg.lowStockThreshold || 20));
  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Purchase Orders (${esc(mode)})</h2><p>Items below low-stock threshold (&le; ${cfg.lowStockThreshold} units).</p></div></div>
    <div class="card"><div id="po-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#po-tbl"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "stock", label: "Current Stock", render: (m) => `<span class="badge badge-red">${m.stock}</span>` },
      { key: "purchaseRate", label: "Last Rate", render: (m) => money(m.purchaseRate) }
    ],
    rows: lowMeds,
    exportFileName: "pharmacy-reorder-list.csv",
    printTitle: "Pharmacy Low-Stock Reorder Order"
  });
}

async function renderPharmacyReport(container, reportName) {
  if (reportName === "Audit Report") auth.requirePermission("view_financial_reports", "view pharmacy audit reports");
  const [sales, meds, purchases, returns] = await Promise.all([
    db.list("pharmacy_sales"),
    db.list("medicines"),
    db.list("pharmacy_purchases"),
    db.list("pharmacy_sales_returns")
  ]);

  let columns = [];
  let rows = [];
  if (reportName === "Stock Valuation" || reportName === "Expiry Report" || reportName === "Low Stock") {
    columns = [
      { key: "name", label: "Medicine" },
      { key: "batchNo", label: "Batch" },
      { key: "expiry", label: "Expiry" },
      { key: "stock", label: "Stock" },
      { key: "purchaseRate", label: "Cost", render: (m) => money(m.purchaseRate) },
      { key: "val", label: "Stock Value", value: (m) => (m.stock * m.purchaseRate).toFixed(2), render: (m) => money(m.stock * m.purchaseRate) }
    ];
    rows = reportName === "Low Stock" ? meds.filter((m) => m.stock <= 20) : meds;
  } else if (reportName.includes("Purchase") || reportName === "GSTR-2" || reportName === "Supplier Payment" || reportName === "Pending Vendor") {
    columns = [
      { key: "id", label: "GRN ID" },
      { key: "grnDate", label: "Date" },
      { key: "supplier", label: "Supplier" },
      { key: "subTotal", label: "Taxable", render: (p) => money(p.subTotal) },
      { key: "gstAmount", label: "Input GST", render: (p) => money(p.gstAmount) },
      { key: "netTotal", label: "Net Invoice", render: (p) => money(p.netTotal) },
      { key: "status", label: "Status" }
    ];
    rows = purchases;
  } else if (reportName === "Sales Returns") {
    columns = [
      { key: "returnDate", label: "Date" },
      { key: "billNo", label: "Bill No" },
      { key: "medName", label: "Medicine" },
      { key: "qty", label: "Qty" },
      { key: "refundAmount", label: "Refund", render: (r) => money(r.refundAmount) }
    ];
    rows = returns;
  } else {
    columns = [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "saleType", label: "Type" },
      { key: "subTotal", label: "Taxable", render: (s) => money(s.subTotal) },
      { key: "gstAmount", label: "Output GST", render: (s) => money(s.gstAmount) },
      { key: "netTotal", label: "Net Total", render: (s) => money(s.netTotal) },
      { key: "paymentMode", label: "Mode" }
    ];
    rows = sales;
  }

  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Report: ${esc(reportName)}</h2><p>Tax compliance, inventory valuation, and daily sales analytics.</p></div></div>
    <div class="card"><div id="ph-rep-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#ph-rep-tbl"), {
    columns,
    rows,
    exportFileName: `pharmacy-${reportName.toLowerCase().replace(/\s+/g, "-")}.csv`,
    printTitle: `Pharmacy — ${reportName}`
  });
}

async function renderSalesReminders(container) {
  const patients = await db.list("patients");
  container.innerHTML = `
    <div class="module-header"><div><h2>Chronic-Care Medication Refill Reminders</h2><p>Notify diabetic, hypertensive, and regular pharmacy customers when refills are due.</p></div></div>
    <div class="card"><div id="refill-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#refill-tbl"), {
    columns: [
      { key: "uhid", label: "UHID" },
      { key: "fullName", label: "Patient Name" },
      { key: "phone", label: "Mobile" },
      { key: "act", label: "Remind", noExport: true, render: (p) => `<button class="btn btn-sm btn-success" data-rem="${esc(p.id)}">Send Refill Reminder</button>` }
    ],
    rows: patients
  });
  container.querySelector("#refill-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-rem]");
    if (!btn) return;
    const p = patients.find((x) => x.id === btn.dataset.rem);
    const res = await queueOrSendNotification({
      recipientName: p.fullName,
      phone: p.phone,
      channel: "WhatsApp",
      category: "Pharmacy Refill",
      message: `Hello ${p.fullName}, your monthly prescription refill is due at CuraTech Pharmacy. Reply to reserve!`
    });
    toast("Refill reminder logged!", "success");
    if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
  };
}
