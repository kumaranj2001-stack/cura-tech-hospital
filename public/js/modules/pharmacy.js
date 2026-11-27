/**
 * Pharmacy Module: Prescription Dispensing, Fast Counter POS (Search/Barcode/GST),
 * Sales Returns, Pending Bills, Purchase / DC GRN (Admin-Approved), Stock Verification,
 * Tax Reports (GSTR-1/2/HSN) & Chronic Refill Reminders.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, money, todayISO, mountDataTable, toast } from "../ui.js";
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
      return renderBillTools(container, params.mode || "search");
    case "pharma_purchase":
      return renderPurchaseGrn(container, "Purchase");
    case "pharma_dc_purchase":
      return renderPurchaseGrn(container, "Delivery Challan");
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
      return renderPharmacyReport(container, params.report || "Daily Sales");
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
    if (!rx || rx.status === "Dispensed") return;

    const billItems = [];
    let netTotal = 0;
    let totalGst = 0;

    for (const item of rx.items || []) {
      const med = meds.find((m) => m.id === item.medId || m.name === item.medName);
      const qty = Number(item.qty || 1);
      if (med && qty > Number(med.stock || 0)) {
        return toast(`Insufficient stock for ${med.name} (Available: ${med.stock}, Required: ${qty}).`, "error");
      }
      const mrp = Number(med?.mrp || 50);
      const gstPct = Number(med?.gstPercent || 12);
      const amount = qty * mrp;
      const gstAmt = amount - amount / (1 + gstPct / 100);
      netTotal += amount;
      totalGst += gstAmt;
      billItems.push({
        medId: med?.id || item.medId,
        medName: item.medName,
        batchNo: med?.batchNo || "BATCH",
        qty,
        mrp,
        gstPercent: gstPct,
        amount
      });
    }

    for (const bi of billItems) {
      const med = meds.find((m) => m.id === bi.medId);
      if (med) {
        await db.update("medicines", med.id, { stock: Math.max(0, Number(med.stock) - bi.qty) });
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
    toast(`Dispensed & Billed (${billNo})!`, "success");
    await printThermalBill({
      title: "PHARMACY PRESCRIPTION BILL",
      billNo,
      billDate: todayISO(),
      patientName: rx.patientName,
      uhid: rx.uhid,
      items: billItems,
      subTotal,
      gstAmount: totalGst,
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
  const today = todayISO();

  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Counter Billing (General POS)</h2><p>Search medicines by name/generic/barcode, verify batch expiry &amp; stock, calculate GST, and print 80mm invoice.</p></div></div>
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Add Medicine to Cart</h3>
        <div class="form-grid">
          <div class="form-group form-span-2">
            <label>Quick Filter (Name / Generic / Barcode)</label>
            <input id="pos-med-filter" type="search" placeholder="Type medicine name or scan barcode..." />
          </div>
          <div class="form-group form-span-2">
            <label>Select Medicine (Batch &amp; Stock)</label>
            <select id="pos-med-sel"></select>
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

  const selEl = container.querySelector("#pos-med-sel");
  const filterEl = container.querySelector("#pos-med-filter");

  const populateMedSelect = () => {
    const q = (filterEl.value || "").trim().toLowerCase();
    const list = q
      ? meds.filter((m) =>
          `${m.name} ${m.generic || ""} ${m.barcode || ""} ${m.batchNo || ""}`.toLowerCase().includes(q)
        )
      : meds;
    selEl.innerHTML = list.length
      ? list.map((m) => {
          const isExpired = m.expiry && m.expiry < today;
          return `<option value="${esc(m.id)}">${esc(m.name)} | Batch:${esc(m.batchNo)} | Exp:${esc(m.expiry)}${isExpired ? " [EXPIRED]" : ""} | Stock:${m.stock} | ₹${m.mrp}</option>`;
        }).join("")
      : `<option value="">No matching medicine found</option>`;
  };
  populateMedSelect();
  filterEl.oninput = populateMedSelect;

  const renderCart = () => {
    const disc = Number(container.querySelector("#pos-disc").value || 0);
    const gross = cart.reduce((s, c) => s + c.amount, 0);
    const gst = cart.reduce((s, c) => s + (c.amount - c.amount / (1 + c.gstPercent / 100)), 0);
    const sub = gross - gst;
    const net = Math.max(0, gross - disc);
    container.querySelector("#pos-totals").innerHTML = `SubTotal: <strong>${money(sub)}</strong> | GST: <strong>${money(gst)}</strong> | Net Payable: <strong>${money(net)}</strong>`;

    container.querySelector("#pos-cart-wrap").innerHTML = cart.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>MRP</th><th>Amt</th><th></th></tr></thead><tbody>
          ${cart.map((c, idx) => `<tr><td>${esc(c.medName)}</td><td>${esc(c.batchNo)}</td><td>${c.qty}</td><td>₹${c.mrp}</td><td>${money(c.amount)}</td><td><button type="button" class="btn btn-sm btn-danger" data-rm="${idx}">×</button></td></tr>`).join("")}
        </tbody></table></div>`
      : `<div style="color:var(--text-muted);font-size:12px;">Cart is empty. Add medicines from above.</div>`;
  };
  renderCart();

  container.querySelector("#pos-disc").oninput = renderCart;
  container.querySelector("#pos-add-btn").onclick = () => {
    const med = meds.find((m) => m.id === selEl.value);
    const qty = Number(container.querySelector("#pos-qty").value || 1);
    if (!med || qty <= 0) return;
    if (med.expiry && med.expiry < today) {
      return toast(`Blocked: Batch ${med.batchNo} of ${med.name} is expired (${med.expiry}).`, "error");
    }
    const existing = cart.find((c) => c.medId === med.id);
    const alreadyInCart = existing ? existing.qty : 0;
    if (alreadyInCart + qty > Number(med.stock)) {
      return toast(`Only ${med.stock} available in stock for ${med.name} (${alreadyInCart} already in cart).`, "error");
    }
    if (existing) {
      existing.qty += qty;
      existing.amount = existing.qty * existing.mrp;
    } else {
      cart.push({
        medId: med.id,
        medName: med.name,
        batchNo: med.batchNo,
        qty,
        mrp: Number(med.mrp),
        gstPercent: Number(med.gstPercent || 12),
        amount: qty * Number(med.mrp)
      });
    }
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
    if (!med) return;
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
          ${mode === "void" && s.status !== "Voided" ? `<button class="btn btn-sm btn-danger" data-void="${esc(s.id)}">Void Bill</button>` : ""}
        `
      }
    ],
    rows: sales
  });
  container.querySelector("#ph-tools-tbl").onclick = async (e) => {
    const rp = e.target.closest("button[data-reprint]");
    const vd = e.target.closest("button[data-void]");
    if (rp) {
      const s = sales.find((x) => x.id === rp.dataset.reprint);
      await printThermalBill({
        title: "PHARMACY BILL REPRINT",
        billNo: s.id,
        billDate: s.billDate,
        patientName: s.patientName,
        uhid: s.uhid,
        items: s.items,
        subTotal: s.subTotal,
        gstAmount: s.gstAmount,
        discount: s.discount,
        netTotal: s.netTotal,
        paymentMode: s.paymentMode,
        cashier: s.billedBy
      });
    } else if (vd) {
      auth.requirePermission("void_bills", "void pharmacy bills");
      await db.update("pharmacy_sales", vd.dataset.void, { status: "Voided", voidedBy: auth.getCurrentUser().username });
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
    if (!med) return;
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
      await auth.logAudit("DRAFT_GRN", "Pharmacy", `Staff submitted pending GRN ${grnId}`);
      toast(`GRN ${grnId} saved as Pending Approval. Waiting for Admin approval.`, "warn");
    }
    renderPurchaseGrn(container, purchaseType);
  };
}

async function renderPurchaseReturns(container) {
  const [meds, returns] = await Promise.all([db.list("medicines"), db.list("pharmacy_purchase_returns")]);
  container.innerHTML = `
    <div class="module-header"><div><h2>Supplier Purchase Returns</h2><p>Return expired or damaged stock to suppliers and deduct inventory.</p></div></div>
    <div class="card">
      <form id="pret-form" class="form-grid">
        <div class="form-group"><label>Medicine</label><select name="medId">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (Stock: ${m.stock})</option>`).join("")}</select></div>
        <div class="form-group"><label>Return Qty</label><input name="qty" type="number" min="1" value="5" required /></div>
        <div class="form-group"><label>Supplier</label><input name="supplier" value="Apollo MedSupply Distributors" required /></div>
        <div class="form-group"><label>Reason</label><input name="reason" value="Near Expiry / Damaged" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-warning">Post Purchase Return</button></div>
      </form>
    </div>
    <div class="card"><div id="pret-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pret-tbl"), {
    columns: [{ key: "returnDate", label: "Date" }, { key: "medName", label: "Medicine" }, { key: "supplier", label: "Supplier" }, { key: "qty", label: "Qty" }, { key: "reason", label: "Reason" }],
    rows: returns
  });
  container.querySelector("#pret-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const med = meds.find((m) => m.id === fd.get("medId"));
    const qty = Number(fd.get("qty"));
    if (!med || qty > Number(med.stock || 0)) return toast("Return qty exceeds available stock.", "error");
    await db.update("medicines", med.id, { stock: Math.max(0, Number(med.stock) - qty) });
    await db.add("pharmacy_purchase_returns", { returnDate: todayISO(), medName: med.name, supplier: fd.get("supplier"), qty, reason: fd.get("reason") });
    toast("Supplier purchase return posted.", "success");
    renderPurchaseReturns(container);
  };
}

async function renderPhysicalStockVerification(container) {
  const meds = await db.list("medicines");
  const canAdjust = auth.hasPermission("manage_inventory_settings") || auth.isAdmin();

  container.innerHTML = `
    <div class="module-header"><div><h2>Physical Stock Verification &amp; Cycle Count</h2><p>Compare physical shelf count against system batch quantities.${canAdjust ? "" : " (Staff count-check only — stock adjustments require Admin.)"}</p></div></div>
    <div class="card"><div id="psv-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#psv-tbl"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "batchNo", label: "Batch" },
      { key: "expiry", label: "Expiry" },
      { key: "stock", label: "System Stock" },
      {
        key: "act",
        label: "Verify Count",
        noExport: true,
        render: (m) => `<div style="display:flex;gap:4px;"><input type="number" style="width:72px;" value="${m.stock}" id="cnt-${esc(m.id)}" /><button class="btn btn-sm btn-primary" data-ver="${esc(m.id)}" ${canAdjust ? "" : "disabled"}>${canAdjust ? "Reconcile" : "Admin Only"}</button></div>`
      }
    ],
    rows: meds
  });
  if (canAdjust) {
    container.querySelector("#psv-tbl").onclick = async (e) => {
      const btn = e.target.closest("button[data-ver]");
      if (!btn) return;
      const id = btn.dataset.ver;
      const val = Number(container.querySelector(`#cnt-${id}`).value);
      await db.update("medicines", id, { stock: Math.max(0, val) });
      await auth.logAudit("STOCK_VERIFY", "Pharmacy", `Reconciled medicine ${id} stock to ${val}`);
      toast("Physical stock reconciled.", "success");
      renderPhysicalStockVerification(container);
    };
  }
}

async function renderManualStockUpdate(container) {
  auth.requirePermission("manage_inventory_settings", "adjust medicine stock & MRP manually");
  const meds = await db.list("medicines");
  container.innerHTML = `
    <div class="module-header"><div><h2>Manual Stock &amp; Batch Rate Update (Admin)</h2></div></div>
    <div class="card">
      <form id="msu-form" class="form-grid">
        <div class="form-group"><label>Medicine</label><select name="medId">${meds.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (Curr: ${m.stock})</option>`).join("")}</select></div>
        <div class="form-group"><label>New Stock Qty</label><input name="stock" type="number" min="0" required /></div>
        <div class="form-group"><label>Batch No</label><input name="batchNo" placeholder="Keep existing if blank" /></div>
        <div class="form-group"><label>New MRP (₹)</label><input name="mrp" type="number" step="0.01" placeholder="Keep existing if blank" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Update Batch Inventory</button></div>
      </form>
    </div>
  `;
  container.querySelector("#msu-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const med = meds.find((m) => m.id === fd.get("medId"));
    await db.update("medicines", med.id, {
      stock: Number(fd.get("stock")),
      batchNo: fd.get("batchNo") || med.batchNo,
      mrp: fd.get("mrp") ? Number(fd.get("mrp")) : med.mrp
    });
    await auth.logAudit("MANUAL_STOCK", "Pharmacy", `Adjusted ${med.name} stock to ${fd.get("stock")}`);
    toast("Batch inventory updated.", "success");
    renderManualStockUpdate(container);
  };
}

async function renderPurchaseListManage(container, allowDelete) {
  auth.requirePermission("approve_grn", "modify or delete GRN purchase invoices");
  const purchases = await db.list("pharmacy_purchases");
  container.innerHTML = `
    <div class="module-header"><div><h2>${allowDelete ? "Delete Purchase Invoices (Admin)" : "Purchase / GRN Update Log"}</h2></div></div>
    <div class="card"><div id="pm-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pm-tbl"), {
    columns: [
      { key: "id", label: "GRN ID" },
      { key: "grnDate", label: "Date" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "supplier", label: "Supplier" },
      { key: "netTotal", label: "Net Total", render: (g) => money(g.netTotal) },
      { key: "status", label: "Status" },
      { key: "act", label: "Action", noExport: true, render: (g) => allowDelete ? `<button class="btn btn-sm btn-danger" data-del="${esc(g.id)}">Delete</button>` : "-" }
    ],
    rows: purchases
  });
  if (allowDelete) {
    container.querySelector("#pm-tbl").onclick = async (e) => {
      const btn = e.target.closest("button[data-del]");
      if (!btn) return;
      await db.remove("pharmacy_purchases", btn.dataset.del);
      await auth.logAudit("DELETE_GRN", "Pharmacy", `Deleted GRN ${btn.dataset.del}`);
      toast("Purchase deleted.", "warn");
      renderPurchaseListManage(container, true);
    };
  }
}

async function renderPharmacyOrders(container, mode) {
  const [meds, cfg] = await Promise.all([db.list("medicines"), db.getHospitalSettings()]);
  const low = meds.filter((m) => Number(m.stock) <= Number(cfg.lowStockThreshold || 15));
  container.innerHTML = `
    <div class="module-header"><div><h2>Pharmacy Purchase Orders &amp; Reorder Queue (${esc(mode)})</h2></div></div>
    <div class="card"><div id="po-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#po-tbl"), {
    columns: [
      { key: "name", label: "Medicine" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "stock", label: "Current Stock" },
      { key: "purchaseRate", label: "Last Rate", render: (m) => money(m.purchaseRate) }
    ],
    rows: low.length ? low : meds,
    exportFileName: "pharmacy-reorder-list.csv"
  });
}

async function renderPharmacyReport(container, reportName) {
  const financialReports = ["Item Margin", "Stock Valuation", "Audit Report"];
  if (financialReports.includes(reportName)) {
    auth.requirePermission("view_financial_reports", `view pharmacy ${reportName}`);
  }

  const [sales, meds, purchases, returns, cfg] = await Promise.all([
    db.list("pharmacy_sales"),
    db.list("medicines"),
    db.list("pharmacy_purchases"),
    db.list("pharmacy_sales_returns"),
    db.getHospitalSettings()
  ]);

  let columns = [];
  let rows = [];

  if (reportName === "Low Stock" || reportName === "Near Expiry" || reportName === "Stock Valuation") {
    columns = [
      { key: "name", label: "Medicine" },
      { key: "batchNo", label: "Batch" },
      { key: "expiry", label: "Expiry" },
      { key: "stock", label: "Stock" },
      { key: "mrp", label: "MRP", render: (m) => money(m.mrp) },
      { key: "val", label: "Stock Value", render: (m) => money(Number(m.stock) * Number(m.purchaseRate)) }
    ];
    if (reportName === "Low Stock") {
      rows = meds.filter((m) => Number(m.stock) <= Number(cfg.lowStockThreshold || 15));
    } else if (reportName === "Near Expiry") {
      const cutoff = new Date(Date.now() + Number(cfg.nearExpiryDays || 90) * 86400000).toISOString().slice(0, 10);
      rows = meds.filter((m) => m.expiry && m.expiry <= cutoff);
    } else {
      rows = meds;
    }
  } else if (reportName === "GSTR-1" || reportName === "HSN Summary") {
    columns = [
      { key: "id", label: "Invoice" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Party" },
      { key: "subTotal", label: "Taxable Value", render: (s) => money(s.subTotal) },
      { key: "gstAmount", label: "Total GST", render: (s) => money(s.gstAmount) },
      { key: "netTotal", label: "Invoice Total", render: (s) => money(s.netTotal) }
    ];
    rows = sales.filter((s) => s.status !== "Voided");
  } else if (reportName === "GSTR-2" || reportName === "Purchase Register" || reportName.includes("Supplier")) {
    columns = [
      { key: "id", label: "GRN ID" },
      { key: "grnDate", label: "Date" },
      { key: "invoiceNo", label: "Supplier Inv" },
      { key: "supplier", label: "Supplier" },
      { key: "subTotal", label: "Taxable", render: (g) => money(g.subTotal) },
      { key: "gstAmount", label: "Input GST", render: (g) => money(g.gstAmount) },
      { key: "netTotal", label: "Net Amount", render: (g) => money(g.netTotal) },
      { key: "status", label: "Approval" }
    ];
    rows = purchases;
  } else if (reportName === "Sales Returns") {
    columns = [{ key: "returnDate", label: "Date" }, { key: "billNo", label: "Bill" }, { key: "medName", label: "Medicine" }, { key: "qty", label: "Qty" }, { key: "refundAmount", label: "Refund", render: (r) => money(r.refundAmount) }];
    rows = returns;
  } else {
    columns = [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "saleType", label: "Type" },
      { key: "gstAmount", label: "GST", render: (s) => money(s.gstAmount) },
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
    printTitle: `Guru Hospital Pharmacy — ${reportName}`
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
      message: `Hello ${p.fullName}, your monthly prescription refill is due at Guru Hospital Pharmacy. Reply to reserve!`
    });
    toast("Refill reminder logged!", "success");
    if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
  };
}
