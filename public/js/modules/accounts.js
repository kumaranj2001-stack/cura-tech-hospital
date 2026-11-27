/**
 * Back-Office Accounts Module: Final Cash Close, Chart of Accounts, Expense Approvals,
 * Receivables, Cross-Module Bill Search & Doctor Income Payouts.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, todayISO, money, mountDataTable, toast } from "../ui.js";

export async function renderAccountsView(viewId, container, params = {}) {
  auth.requirePermission("accounts", "access financial accounts");
  switch (viewId) {
    case "acc_cash_close":
      return renderFinalCashClose(container);
    case "acc_cash_close_log":
      return renderCashCloseLog(container);
    case "acc_chart":
      return renderChartOfAccounts(container);
    case "acc_add_expense":
    case "acc_pending_expense":
      return renderExpenses(container, viewId === "acc_pending_expense");
    case "acc_receivables":
    case "acc_credit_pending":
      return renderReceivables(container);
    case "acc_reports":
      return renderAccountsReport(container, params.type || "Transactions");
    case "acc_bill_search":
      return renderBillSearch(container, params.source || "Cashier");
    case "acc_doctor_payout":
    case "acc_doctor_payout_report":
      return renderDoctorPayouts(container, viewId === "acc_doctor_payout_report");
    default:
      return renderFinalCashClose(container);
  }
}

async function renderFinalCashClose(container) {
  const [cashBills, pharmaBills, expenses] = await Promise.all([
    db.list("cashier_bills"),
    db.list("pharmacy_sales"),
    db.list("expenses")
  ]);
  const today = todayISO();
  const sysCashierCash = cashBills.filter((b) => b.billDate === today && b.status === "Paid" && b.paymentMode === "Cash").reduce((s, b) => s + Number(b.paidAmount || 0), 0);
  const sysPharmaCash = pharmaBills.filter((b) => b.billDate === today && b.status === "Paid" && b.paymentMode === "Cash").reduce((s, b) => s + Number(b.netTotal || 0), 0);
  const cashExpenses = expenses.filter((e) => e.date === today && e.status === "Approved" && e.mode === "Cash").reduce((s, e) => s + Number(e.amount || 0), 0);
  const expectedNetCash = sysCashierCash + sysPharmaCash - cashExpenses;

  container.innerHTML = `
    <div class="module-header"><div><h2>Final Cash Drawer Close &amp; Reconciliation</h2><p>Verify physical cash drawer against system collections at shift or day end.</p></div></div>
    <div class="kpi-grid">
      <div class="kpi-card green"><div class="kpi-label">Hospital Counter Cash</div><div class="kpi-value">${money(sysCashierCash)}</div></div>
      <div class="kpi-card cyan"><div class="kpi-label">Pharmacy Counter Cash</div><div class="kpi-value">${money(sysPharmaCash)}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Approved Cash Expenses</div><div class="kpi-value">${money(cashExpenses)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Expected Physical Cash</div><div class="kpi-value">${money(expectedNetCash)}</div></div>
    </div>
    <div class="card">
      <form id="cc-form" class="form-grid">
        <div class="form-group"><label>Closing Date</label><input name="closeDate" type="date" value="${today}" required /></div>
        <div class="form-group"><label>Physical Drawer Cash Count (₹) *</label><input name="physicalCash" type="number" step="0.01" value="${expectedNetCash.toFixed(2)}" required /></div>
        <div class="form-group form-span-2"><label>Remarks / Variance Reason</label><input name="remarks" value="Verified and tallied with shift cashbook" /></div>
        <div class="form-actions"><button type="submit" class="btn btn-success">Submit Final Cash Close</button></div>
      </form>
    </div>
  `;

  container.querySelector("#cc-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const physical = Number(fd.get("physicalCash"));
    await db.add("cash_closes", {
      closeDate: fd.get("closeDate"),
      expectedCash: expectedNetCash,
      physicalCash: physical,
      variance: physical - expectedNetCash,
      remarks: fd.get("remarks"),
      closedBy: auth.getCurrentUser().username
    });
    await auth.logAudit("CASH_CLOSE", "Accounts", `Closed cash drawer: Expected ₹${expectedNetCash}, Physical ₹${physical}`);
    toast("Final Cash Close logged!", "success");
    renderCashCloseLog(container);
  };
}

async function renderCashCloseLog(container) {
  const closes = await db.list("cash_closes");
  container.innerHTML = `<div class="module-header"><div><h2>Final Cash Close Log</h2></div></div><div class="card"><div id="cc-log-tbl"></div></div>`;
  mountDataTable(container.querySelector("#cc-log-tbl"), {
    columns: [
      { key: "closeDate", label: "Date" },
      { key: "expectedCash", label: "System Expected", render: (c) => money(c.expectedCash) },
      { key: "physicalCash", label: "Physical Count", render: (c) => money(c.physicalCash) },
      { key: "variance", label: "Variance", render: (c) => money(c.variance) },
      { key: "closedBy", label: "Closed By" },
      { key: "remarks", label: "Remarks" }
    ],
    rows: closes,
    exportFileName: "cash-close-log.csv",
    printTitle: "Final Cash Close Audit Log"
  });
}

async function renderChartOfAccounts(container) {
  const accounts = await db.list("accounts");
  container.innerHTML = `
    <div class="module-header"><div><h2>Chart of Accounts &amp; Ledger Setup</h2></div></div>
    <div class="card">
      <form id="coa-form" class="form-grid">
        <div class="form-group"><label>Ledger Code *</label><input name="code" required placeholder="e.g. 5005" /></div>
        <div class="form-group"><label>Account Name *</label><input name="name" required placeholder="e.g. Electricity &amp; Generator" /></div>
        <div class="form-group"><label>Group</label><select name="group"><option>Asset</option><option>Bank</option><option>Income</option><option>Expense</option><option>Liability</option></select></div>
        <div class="form-group"><label>Opening Balance (₹)</label><input name="balance" type="number" value="0" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add Account Ledger</button></div>
      </form>
    </div>
    <div class="card"><div id="coa-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#coa-tbl"), {
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Account Ledger" },
      { key: "group", label: "Group" },
      { key: "balance", label: "Balance", render: (a) => money(a.balance) }
    ],
    rows: accounts
  });
  container.querySelector("#coa-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("accounts", { code: fd.get("code"), name: fd.get("name"), group: fd.get("group"), balance: Number(fd.get("balance")) });
    toast("Account ledger created.", "success");
    renderChartOfAccounts(container);
  };
}

async function renderExpenses(container, pendingOnly) {
  const [expenses, accounts] = await Promise.all([db.list("expenses"), db.list("accounts")]);
  const rows = pendingOnly ? expenses.filter((e) => e.status === "Pending Approval") : expenses;
  container.innerHTML = `
    <div class="module-header"><div><h2>${pendingOnly ? "Pending Expense Approvals" : "Hospital Operational Expenses"}</h2></div></div>
    ${!pendingOnly ? `
    <div class="card">
      <form id="exp-form" class="form-grid">
        <div class="form-group"><label>Expense Ledger</label><select name="ledger">${accounts.map((a) => `<option>${esc(a.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Payee / Vendor *</label><input name="vendor" required /></div>
        <div class="form-group"><label>Amount (₹) *</label><input name="amount" type="number" min="1" required /></div>
        <div class="form-group"><label>Payment Mode</label><select name="mode"><option>Cash</option><option>Bank Transfer</option><option>UPI</option></select></div>
        <div class="form-group form-span-2"><label>Narration *</label><input name="narration" required /></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Record Expense</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="exp-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#exp-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "ledger", label: "Ledger" },
      { key: "vendor", label: "Vendor" },
      { key: "narration", label: "Narration" },
      { key: "amount", label: "Amount", render: (e) => money(e.amount) },
      { key: "status", label: "Status", render: (e) => `<span class="badge ${e.status === "Approved" ? "badge-green" : "badge-amber"}">${esc(e.status)}</span>` },
      {
        key: "act",
        label: "Approve",
        noExport: true,
        render: (e) => e.status === "Pending Approval" ? `<button class="btn btn-sm btn-success" data-app="${esc(e.id)}">Approve</button>` : "Approved"
      }
    ],
    rows
  });
  if (!pendingOnly) {
    container.querySelector("#exp-form").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await db.add("expenses", {
        date: todayISO(),
        ledger: fd.get("ledger"),
        vendor: fd.get("vendor"),
        amount: Number(fd.get("amount")),
        mode: fd.get("mode"),
        narration: fd.get("narration"),
        status: auth.isAdmin() ? "Approved" : "Pending Approval",
        createdBy: auth.getCurrentUser().username
      });
      toast("Expense saved.", "success");
      renderExpenses(container, pendingOnly);
    };
  }
  container.querySelector("#exp-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-app]");
    if (!btn) return;
    await db.update("expenses", btn.dataset.app, { status: "Approved", approvedBy: auth.getCurrentUser().username });
    toast("Expense approved.", "success");
    renderExpenses(container, pendingOnly);
  };
}

async function renderReceivables(container) {
  const recs = await db.list("receivables");
  container.innerHTML = `
    <div class="module-header"><div><h2>Corporate &amp; Insurance Receivables</h2></div></div>
    <div class="card">
      <form id="rec-form" class="form-grid">
        <div class="form-group"><label>Corporate / TPA Name *</label><input name="party" required placeholder="e.g. Star Health TPA" /></div>
        <div class="form-group"><label>Claim / Invoice Ref</label><input name="refNo" required /></div>
        <div class="form-group"><label>Amount Due (₹)</label><input name="amount" type="number" min="1" required /></div>
        <div class="form-group"><label>Due Date</label><input name="dueDate" type="date" value="${todayISO()}" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">+ Add Receivable</button></div>
      </form>
    </div>
    <div class="card"><div id="rec-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#rec-tbl"), {
    columns: [
      { key: "party", label: "Corporate / TPA" },
      { key: "refNo", label: "Claim Ref" },
      { key: "dueDate", label: "Due Date" },
      { key: "amount", label: "Amount", render: (r) => money(r.amount) },
      { key: "status", label: "Status" }
    ],
    rows: recs
  });
  container.querySelector("#rec-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("receivables", { party: fd.get("party"), refNo: fd.get("refNo"), amount: Number(fd.get("amount")), dueDate: fd.get("dueDate"), status: "Pending" });
    toast("Receivable recorded.", "success");
    renderReceivables(container);
  };
}

async function renderAccountsReport(container, type) {
  const [cash, pharma, expenses] = await Promise.all([db.list("cashier_bills"), db.list("pharmacy_sales"), db.list("expenses")]);
  let rows = [];
  if (type === "Expenses") {
    rows = expenses.map((e) => ({ date: e.date, ref: e.id, party: e.vendor, desc: e.narration, amt: e.amount, status: e.status }));
  } else {
    rows = [
      ...cash.map((c) => ({ date: c.billDate, ref: c.id, party: c.patientName, desc: c.department, amt: c.netAmount, status: c.status })),
      ...pharma.map((p) => ({ date: p.billDate, ref: p.id, party: p.patientName, desc: "Pharmacy Sale", amt: p.netTotal, status: p.status }))
    ];
  }
  container.innerHTML = `<div class="module-header"><div><h2>Accounts ${esc(type)} Report</h2></div></div><div class="card"><div id="acc-rep-tbl"></div></div>`;
  mountDataTable(container.querySelector("#acc-rep-tbl"), {
    columns: [
      { key: "date", label: "Date" },
      { key: "ref", label: "Voucher / Bill No" },
      { key: "party", label: "Party / Patient" },
      { key: "desc", label: "Particulars" },
      { key: "amt", label: "Amount", render: (r) => money(r.amt) },
      { key: "status", label: "Status" }
    ],
    rows,
    exportFileName: `accounts-${type.toLowerCase()}.csv`,
    printTitle: `Accounts ${type} Report`
  });
}

async function renderBillSearch(container, source) {
  const rows = await db.list(source === "Pharmacy" ? "pharmacy_sales" : "cashier_bills");
  container.innerHTML = `<div class="module-header"><div><h2>${esc(source)} Bill Cross-Module Search</h2></div></div><div class="card"><div id="bs-tbl"></div></div>`;
  mountDataTable(container.querySelector("#bs-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "paymentMode", label: "Mode" },
      { key: "status", label: "Status" }
    ],
    rows,
    searchPlaceholder: "Search invoice ID, UHID, patient..."
  });
}

async function renderDoctorPayouts(container, reportOnly) {
  const [doctors, cashBills, payouts] = await Promise.all([db.list("doctors"), db.list("cashier_bills"), db.list("doctor_payouts")]);
  const summary = doctors.map((d) => {
    const rev = cashBills.filter((b) => b.doctorName === d.name && b.status === "Paid").reduce((s, b) => s + Number(b.paidAmount || 0), 0);
    const share = (rev * Number(d.sharePercent || 60)) / 100;
    return { id: d.id, name: d.name, specialisation: d.specialisation, sharePercent: d.sharePercent, revenue: rev, payable: share };
  });

  container.innerHTML = `<div class="module-header"><div><h2>${reportOnly ? "Doctor Income Payment Report" : "Doctor Income Share & Payout Disbursement"}</h2></div></div><div class="card"><div id="doc-pay-tbl"></div></div>`;
  if (reportOnly) {
    mountDataTable(container.querySelector("#doc-pay-tbl"), {
      columns: [
        { key: "payoutDate", label: "Date" },
        { key: "doctorName", label: "Doctor" },
        { key: "grossRevenue", label: "Collected Revenue", render: (p) => money(p.grossRevenue) },
        { key: "payoutAmount", label: "Disbursed Share", render: (p) => money(p.payoutAmount) },
        { key: "paidBy", label: "Processed By" }
      ],
      rows: payouts,
      exportFileName: "doctor-payouts.csv",
      printTitle: "Doctor Income Payment Report"
    });
  } else {
    mountDataTable(container.querySelector("#doc-pay-tbl"), {
      columns: [
        { key: "name", label: "Doctor" },
        { key: "specialisation", label: "Specialisation" },
        { key: "revenue", label: "Collected Revenue", render: (d) => money(d.revenue) },
        { key: "sharePercent", label: "Share %", render: (d) => `${d.sharePercent}%` },
        { key: "payable", label: "Net Payable", render: (d) => `<strong>${money(d.payable)}</strong>` },
        {
          key: "act",
          label: "Disburse",
          noExport: true,
          render: (d) => `<button class="btn btn-sm btn-success" data-paydoc="${esc(d.id)}" ${d.payable <= 0 ? "disabled" : ""}>Record Payout</button>`
        }
      ],
      rows: summary
    });
    container.querySelector("#doc-pay-tbl").onclick = async (e) => {
      const btn = e.target.closest("button[data-paydoc]");
      if (!btn) return;
      const d = summary.find((x) => x.id === btn.dataset.paydoc);
      await db.add("doctor_payouts", {
        payoutDate: todayISO(),
        doctorName: d.name,
        grossRevenue: d.revenue,
        payoutAmount: d.payable,
        paidBy: auth.getCurrentUser().username
      });
      toast(`Payout of ${money(d.payable)} recorded for ${d.name}.`, "success");
    };
  }
}
