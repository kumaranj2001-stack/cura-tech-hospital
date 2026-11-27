/**
 * Cashier Front-Desk Billing, Pending Queues, Multi-Mode Payments,
 * Collection Reports, Uncleared Payments & Tally ERP XML/CSV Export.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, openModal, closeModal, toast } from "../ui.js";
import { printThermalBill } from "../print.js";

export async function renderCashierView(viewId, container, params = {}) {
  switch (viewId) {
    case "cashier_dashboard":
      return renderCashierDashboard(container);
    case "cashier_pending":
    case "cashier_queue_filter":
      return renderPendingQueue(container, params.filter || "All");
    case "cashier_payments":
      return renderQuickPayment(container);
    case "cashier_uncleared":
      return renderUnclearedPayments(container);
    case "cashier_report":
      return renderCashierReport(container, params.report || "EOD Summary");
    case "cashier_tally":
      return renderTallyExport(container, params.format || "XML");
    default:
      return renderCashierDashboard(container);
  }
}

async function renderCashierDashboard(container) {
  const bills = await db.list("cashier_bills");
  const today = todayISO();
  const todayBills = bills.filter((b) => b.billDate === today && b.status !== "Voided");
  const collected = todayBills.filter((b) => b.status === "Paid").reduce((s, b) => s + Number(b.paidAmount || 0), 0);
  const pending = bills.filter((b) => b.status === "Pending");
  const pendingAmt = pending.reduce((s, b) => s + Number(b.netAmount || 0), 0);
  const discounts = todayBills.reduce((s, b) => s + Number(b.discount || 0), 0);

  container.innerHTML = `
    <div class="module-header">
      <div><h2>Cashier Front-Desk Billing Dashboard</h2><p>Real-time collections, pending service orders, discount audit, and thermal receipt printing.</p></div>
      <div class="module-actions">
        <button type="button" class="btn btn-primary" id="btn-new-cash-bill">+ Create Ad-Hoc Service Bill</button>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card green"><div class="kpi-label">Today's Collections</div><div class="kpi-value">${money(collected)}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Pending Bills Queue</div><div class="kpi-value">${pending.length} (${money(pendingAmt)})</div></div>
      <div class="kpi-card red"><div class="kpi-label">Today's Discounts</div><div class="kpi-value">${money(discounts)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total Invoices Today</div><div class="kpi-value">${todayBills.length}</div></div>
    </div>
    <div class="card"><div id="cash-bills-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#cash-bills-tbl"), {
    columns: [
      { key: "id", label: "Bill No", render: (b) => `<strong>${esc(b.id)}</strong>` },
      { key: "billDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "department", label: "Dept" },
      { key: "netAmount", label: "Net Amt", render: (b) => money(b.netAmount) },
      { key: "paymentMode", label: "Mode" },
      { key: "status", label: "Status", render: (b) => `<span class="badge ${b.status === "Paid" ? "badge-green" : b.status === "Voided" ? "badge-red" : "badge-amber"}">${esc(b.status)}</span>` },
      {
        key: "act",
        label: "Actions",
        noExport: true,
        render: (b) => `
          <div style="display:flex;gap:4px;">
            ${b.status === "Pending" ? `<button class="btn btn-sm btn-success" data-pay="${esc(b.id)}">Collect</button>` : ""}
            <button class="btn btn-sm" data-prt="${esc(b.id)}">Receipt</button>
            ${b.status !== "Voided" && auth.hasPermission("void_bills") ? `<button class="btn btn-sm btn-danger" data-void="${esc(b.id)}">Void</button>` : ""}
          </div>
        `
      }
    ],
    rows: bills,
    searchPlaceholder: "Search bill no, UHID, patient...",
    exportFileName: "cashier-bills.csv"
  });

  container.querySelector("#btn-new-cash-bill").onclick = () => openQuickBillModal(() => renderCashierDashboard(container));

  container.querySelector("#cash-bills-tbl").onclick = async (e) => {
    const payBtn = e.target.closest("button[data-pay]");
    const prtBtn = e.target.closest("button[data-prt]");
    const voidBtn = e.target.closest("button[data-void]");

    if (payBtn) {
      const bill = bills.find((b) => b.id === payBtn.dataset.pay);
      openCollectModal(bill, () => renderCashierDashboard(container));
    } else if (prtBtn) {
      const b = bills.find((x) => x.id === prtBtn.dataset.prt);
      await printThermalBill({
        title: "HOSPITAL BILL / RECEIPT",
        billNo: b.id,
        billDate: b.billDate,
        patientName: b.patientName,
        uhid: b.uhid,
        items: b.items || [{ desc: b.department, qty: 1, amount: b.netAmount }],
        subTotal: b.grossAmount,
        discount: b.discount,
        netTotal: b.netAmount,
        paymentMode: b.paymentMode,
        cashier: b.billedBy
      });
    } else if (voidBtn) {
      auth.requirePermission("void_bills", "void/delete bills");
      const b = bills.find((x) => x.id === voidBtn.dataset.void);
      await db.update("cashier_bills", b.id, { status: "Voided", voidedBy: auth.getCurrentUser().username, voidedAt: new Date().toISOString() });
      await auth.logAudit("VOID_BILL", "Cashier", `Voided bill ${b.id} (₹${b.netAmount})`);
      toast(`Bill ${b.id} voided and recorded in anti-fraud audit log.`, "warn");
      renderCashierDashboard(container);
    }
  };
}

function openCollectModal(bill, onDone) {
  openModal({
    title: `Collect Payment: ${bill.id} — ${bill.patientName}`,
    width: "460px",
    bodyHtml: `
      <form id="collect-form" class="form-grid">
        <div class="form-group"><label>Gross Amount</label><input value="${bill.grossAmount}" readonly /></div>
        <div class="form-group"><label>Discount (₹)</label><input name="discount" type="number" min="0" max="${bill.grossAmount}" value="${bill.discount || 0}" /></div>
        <div class="form-group form-span-2"><label>Payment Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option><option>Cheque (Uncleared)</option><option>Bank Transfer</option></select></div>
        <div class="form-actions"><button type="submit" class="btn btn-success">Confirm &amp; Print Receipt</button></div>
      </form>
    `,
    onMount: (slot) => {
      slot.querySelector("#collect-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const discount = Number(fd.get("discount") || 0);
        const netAmount = Math.max(0, Number(bill.grossAmount) - discount);
        const mode = fd.get("paymentMode");
        const isUncleared = mode.includes("Uncleared");
        await db.update("cashier_bills", bill.id, {
          discount,
          netAmount,
          paidAmount: isUncleared ? 0 : netAmount,
          paymentMode: mode,
          status: isUncleared ? "Uncleared" : "Paid",
          billedBy: auth.getCurrentUser().username
        });
        toast(`Payment collected for ${bill.id}.`, "success");
        closeModal();
        onDone();
      };
    }
  });
}

async function openQuickBillModal(onDone) {
  const patients = await db.list("patients");
  openModal({
    title: "Create New Hospital Service Bill",
    bodyHtml: `
      <form id="quick-bill-form" class="form-grid">
        <div class="form-group"><label>Patient</label><select name="uhid">${patients.map((p) => `<option value="${esc(p.uhid)}">${esc(p.uhid)} — ${esc(p.fullName)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Department</label><select name="department"><option>OP Procedure</option><option>Diagnostics</option><option>PreBooking</option><option>Emergency</option></select></div>
        <div class="form-group"><label>Service Description *</label><input name="desc" required placeholder="e.g. ECG / Dressing / Consultation" /></div>
        <div class="form-group"><label>Amount (₹) *</label><input name="amount" type="number" min="1" required /></div>
        <div class="form-group"><label>Discount (₹)</label><input name="discount" type="number" min="0" value="0" /></div>
        <div class="form-group"><label>Payment Mode</label><select name="paymentMode"><option>Cash</option><option>UPI</option><option>Card</option></select></div>
        <div class="form-actions form-span-2"><button type="submit" class="btn btn-primary">Generate Paid Bill</button></div>
      </form>
    `,
    onMount: (slot) => {
      slot.querySelector("#quick-bill-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const pat = patients.find((p) => p.uhid === fd.get("uhid"));
        const gross = Number(fd.get("amount"));
        const disc = Number(fd.get("discount") || 0);
        const net = Math.max(0, gross - disc);
        const id = await db.nextSequence("CSH");
        await db.add("cashier_bills", {
          id,
          billDate: todayISO(),
          uhid: pat.uhid,
          patientName: pat.fullName,
          doctorName: "-",
          department: fd.get("department"),
          items: [{ desc: fd.get("desc"), qty: 1, rate: gross, amount: gross }],
          grossAmount: gross,
          discount: disc,
          netAmount: net,
          paidAmount: net,
          paymentMode: fd.get("paymentMode"),
          status: "Paid",
          billedBy: auth.getCurrentUser().username
        });
        toast(`Bill ${id} saved.`, "success");
        closeModal();
        onDone();
      };
    }
  });
}

async function renderPendingQueue(container, filter) {
  const bills = await db.list("cashier_bills");
  const filtered = bills.filter((b) => b.status === "Pending" && (filter === "All" || b.department === filter));
  container.innerHTML = `
    <div class="module-header"><div><h2>Pending Cashier Queue (${esc(filter)})</h2><p>Unpaid service, diagnostic, prebooking, and emergency orders.</p></div></div>
    <div class="card"><div id="pend-q-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#pend-q-tbl"), {
    columns: [
      { key: "id", label: "Bill ID" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "department", label: "Queue" },
      { key: "netAmount", label: "Due", render: (b) => money(b.netAmount) },
      { key: "act", label: "Collect", noExport: true, render: (b) => `<button class="btn btn-sm btn-success" data-pay="${esc(b.id)}">Settle Payment</button>` }
    ],
    rows: filtered
  });
  container.querySelector("#pend-q-tbl").onclick = (e) => {
    const btn = e.target.closest("button[data-pay]");
    if (!btn) return;
    openCollectModal(filtered.find((b) => b.id === btn.dataset.pay), () => renderPendingQueue(container, filter));
  };
}

async function renderQuickPayment(container) {
  return renderPendingQueue(container, "All");
}

async function renderUnclearedPayments(container) {
  const bills = (await db.list("cashier_bills")).filter((b) => b.status === "Uncleared");
  container.innerHTML = `
    <div class="module-header"><div><h2>Uncleared Cheques &amp; Pending Claims</h2><p>Track and clear pending cheque, card batch, or third-party settlements.</p></div></div>
    <div class="card"><div id="unclear-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#unclear-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "patientName", label: "Patient" },
      { key: "paymentMode", label: "Instrument" },
      { key: "netAmount", label: "Amount", render: (b) => money(b.netAmount) },
      { key: "act", label: "Clear", noExport: true, render: (b) => `<button class="btn btn-sm btn-success" data-clr="${esc(b.id)}">Mark Cleared</button>` }
    ],
    rows: bills,
    emptyText: "No uncleared cheques or claims."
  });
  container.querySelector("#unclear-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-clr]");
    if (!btn) return;
    const b = bills.find((x) => x.id === btn.dataset.clr);
    await db.update("cashier_bills", b.id, { status: "Paid", paidAmount: b.netAmount, paymentMode: "Cleared Bank/Cheque" });
    toast(`Bill ${b.id} cleared!`, "success");
    renderUnclearedPayments(container);
  };
}

async function renderCashierReport(container, reportName) {
  const bills = await db.list("cashier_bills");
  let rows = bills;
  if (reportName === "Discount Report") rows = bills.filter((b) => Number(b.discount) > 0);
  else if (reportName === "Pending Payment") rows = bills.filter((b) => b.status === "Pending");

  container.innerHTML = `
    <div class="module-header"><div><h2>Cashier ${esc(reportName)}</h2><p>Financial collection breakdown and settlement audit.</p></div></div>
    <div class="card"><div id="cash-rep-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#cash-rep-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "patientName", label: "Patient" },
      { key: "doctorName", label: "Doctor" },
      { key: "department", label: "Dept" },
      { key: "grossAmount", label: "Gross", render: (b) => money(b.grossAmount) },
      { key: "discount", label: "Discount", render: (b) => money(b.discount) },
      { key: "paidAmount", label: "Collected", render: (b) => money(b.paidAmount) },
      { key: "paymentMode", label: "Mode" },
      { key: "status", label: "Status" }
    ],
    rows,
    exportFileName: `cashier-${reportName.toLowerCase().replace(/\s+/g, "-")}.csv`,
    printTitle: `Cashier ${reportName}`
  });
}

async function renderTallyExport(container, format) {
  const bills = (await db.list("cashier_bills")).filter((b) => b.status === "Paid");
  container.innerHTML = `
    <div class="module-header"><div><h2>Tally ERP Accounting Voucher Export (${esc(format)})</h2><p>Export structured hospital revenue vouchers directly for TallyPrime / Tally.ERP 9 import.</p></div></div>
    <div class="card">
      <p>Ready to export <strong>${bills.length}</strong> settled hospital vouchers totaling <strong>${money(bills.reduce((s, b) => s + Number(b.paidAmount || 0), 0))}</strong>.</p>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" id="btn-dl-tally-xml">Download Tally XML</button>
      </div>
    </div>
  `;
  container.querySelector("#btn-dl-tally-xml").onclick = () => {
    const vouchers = bills.map((b) => `
      <VOUCHER VCHTYPE="Receipt" ACTION="Create">
        <DATE>${b.billDate.replace(/-/g, "")}</DATE>
        <VOUCHERNUMBER>${esc(b.id)}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${esc(b.patientName)}</PARTYLEDGERNAME>
        <NARRATION>${esc(b.department)} - ${esc(b.uhid)} (${esc(b.paymentMode)})</NARRATION>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(b.paymentMode === "Cash" ? "Cash-in-Hand" : "Bank Collection A/C")}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${Number(b.paidAmount).toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(b.department)} Income</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${Number(b.paidAmount).toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    `).join("\n");
    const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE>${vouchers}</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `curatech-tally-vouchers-${todayISO()}.xml`;
    a.click();
    toast("Tally XML exported!", "success");
  };
}
