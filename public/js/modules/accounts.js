/**
 * Back-Office Accounts Module: Final Cash Close & Log, Chart of Accounts,
 * Expenses & Approvals, Corporate Receivables, Cross-Module Bill Search & Doctor Payouts.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, money, todayISO, mountDataTable, toast } from "../ui.js";

export async function renderAccountsView(viewId, container, params = {}) {
  auth.requirePermission("accounts", "access hospital accounting");

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
      return renderAccountsReport(container, params.type || "transactions");
    case "acc_bill_search":
      return renderBillSearch(container, params.source || "cashier");
    case "acc_doctor_payout":
    case "acc_doctor_payout_report":
      return renderDoctorPayouts(container, viewId === "acc_doctor_payout_report");
    default:
      return renderFinalCashClose(container);
  }
}

async function renderFinalCashClose(container) {
  const [bills, pharma, expenses] = await Promise.all([
    db.list("cashier_bills"),
    db.list("pharmacy_sales"),
    db.list("expenses")
  ]);
  const today = todayISO();
  const hospCash = bills.filter((b) => b.billDate === today && b.status === "Paid" && b.paymentMode === "Cash").reduce((s, b) => s + Number(b.paidAmount ?? b.netAmount ?? 0), 0);
  const phCash = pharma.filter((p) => p.billDate === today && p.status === "Paid" && p.paymentMode === "Cash").reduce((s, p) => s + Number(p.netTotal || 0), 0);
  const cashExp = expenses.filter((e) => e.expDate === today && e.status === "Approved" && e.mode === "Cash").reduce((s, e) => s + Number(e.amount || 0), 0);
  const expectedNetCash = hospCash + phCash - cashExp;

  container.innerHTML = `
    <div class="module-header"><div><h2>Final Daily Cash Close Verification</h2><p>Reconcile physical cash drawer against Hospital Cashier &amp; Pharmacy system totals.</p></div></div>
    <div class="kpi-grid">
      <div class="kpi-card green"><div class="kpi-label">Hospital Cash</div><div class="kpi-value">${money(hospCash)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Pharmacy Cash</div><div class="kpi-value">${money(phCash)}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Cash Expenses</div><div class="kpi-value">${money(cashExp)}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Expected Drawer Cash</div><div class="kpi-value">${money(expectedNetCash)}</div></div>
    </div>
    <div class="card">
      <form id="cc-form" class="form-grid">
        <div class="form-group"><label>Close Date</label><input name="closeDate" type="date" value="${today}" required /></div>
        <div class="form-group"><label>Physical Drawer Count (₹) *</label><input name="physicalCash" type="number" step="0.01" value="${expectedNetCash}" required /></div>
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
      systemCash: expectedNetCash,
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
      { key: "expectedCash", label: "System Expected", render: (c) => money(c.expectedCash ?? c.systemCash) },
      { key: "physicalCash", label: "Physical Count", render: (c) => money(c.physicalCash) },
      { key: "variance", label: "Variance", render: (c) => money(c.variance) },
      { key: "closedBy", label: "Closed By" },
      { key: "remarks", label: "Remarks" }
    ],
    rows: closes,
    exportFileName: "cash-close-log.csv",
    printTitle: "Guru Hospital — Final Cash Close Audit Log"
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
        <div class="form-group"><label>Expense Ledger</label><select name="ledger">${accounts.map((a) => `<option>${esc(a.name)}</option>`).join("")}<option>General Operating Expense</option></select></div>
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
      { key: "expDate", label: "Date" },
      { key: "ledger", label: "Ledger" },
      { key: "vendor", label: "Vendor" },
      { key: "amount", label: "Amount", render: (e) => money(e.amount) },
      { key: "mode", label: "Mode" },
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
    container.querySelector("#exp-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.add("expenses", {
        expDate: todayISO(),
        ledger: fd.get("ledger"),
        vendor: fd.get("vendor"),
        amount: Number(fd.get("amount")),
        mode: fd.get("mode"),
        narration: fd.get("narration"),
        status: auth.isAdmin() ? "Approved" : "Pending Approval",
        enteredBy: auth.getCurrentUser().username
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
    <div class="module-header"><div><h2>Corporate / TPA Receivables &amp; Credit Pending</h2></div></div>
    <div class="card">
      <form id="rec-form" class="form-grid">
        <div class="form-group"><label>Corporate / TPA Name *</label><input name="party" required placeholder="e.g. Star Health TPA" /></div>
        <div class="form-group"><label>Claim / Reference No *</label><input name="refNo" required /></div>
        <div class="form-group"><label>Receivable Amount (₹) *</label><input name="amount" type="number" min="1" required /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-primary">Add Receivable</button></div>
      </form>
    </div>
    <div class="card"><div id="rec-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#rec-tbl"), {
    columns: [
      { key: "recDate", label: "Date" },
      { key: "party", label: "Corporate / TPA" },
      { key: "refNo", label: "Ref No" },
      { key: "amount", label: "Amount", render: (r) => money(r.amount) },
      { key: "status", label: "Status" },
      { key: "act", label: "Settle", noExport: true, render: (r) => r.status !== "Received" ? `<button class="btn btn-sm btn-success" data-rec="${esc(r.id)}">Mark Received</button>` : "Received" }
    ],
    rows: recs
  });
  container.querySelector("#rec-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.add("receivables", { recDate: todayISO(), party: fd.get("party"), refNo: fd.get("refNo"), amount: Number(fd.get("amount")), status: "Pending" });
    toast("Receivable added.", "success");
    renderReceivables(container);
  };
  container.querySelector("#rec-tbl").onclick = async (e) => {
    const btn = e.target.closest("button[data-rec]");
    if (!btn) return;
    await db.update("receivables", btn.dataset.rec, { status: "Received" });
    toast("Receivable settled.", "success");
    renderReceivables(container);
  };
}

async function renderAccountsReport(container, type) {
  if (type === "audit") auth.requirePermission("view_financial_reports", "view accounts audit");
  const [bills, expenses, recs] = await Promise.all([db.list("cashier_bills"), db.list("expenses"), db.list("receivables")]);
  const rows = type === "expenses" ? expenses : type === "receivables" ? recs : bills;
  container.innerHTML = `<div class="module-header"><div><h2>Accounts Report: ${esc(type.toUpperCase())}</h2></div></div><div class="card"><div id="acc-rep-tbl"></div></div>`;
  mountDataTable(container.querySelector("#acc-rep-tbl"), {
    columns: type === "expenses"
      ? [{ key: "expDate", label: "Date" }, { key: "ledger", label: "Ledger" }, { key: "vendor", label: "Vendor" }, { key: "amount", label: "Amount", render: (r) => money(r.amount) }, { key: "status", label: "Status" }]
      : type === "receivables"
      ? [{ key: "recDate", label: "Date" }, { key: "party", label: "Party" }, { key: "refNo", label: "Ref" }, { key: "amount", label: "Amount", render: (r) => money(r.amount) }, { key: "status", label: "Status" }]
      : [{ key: "id", label: "Bill ID" }, { key: "billDate", label: "Date" }, { key: "patientName", label: "Patient" }, { key: "netAmount", label: "Net Amt", render: (r) => money(r.netAmount) }, { key: "paymentMode", label: "Mode" }],
    rows,
    exportFileName: `accounts-${type}.csv`,
    printTitle: `Guru Hospital Accounts — ${type.toUpperCase()}`
  });
}

async function renderBillSearch(container, source) {
  const rows = source === "pharmacy" ? await db.list("pharmacy_sales") : await db.list("cashier_bills");
  container.innerHTML = `<div class="module-header"><div><h2>${source === "pharmacy" ? "Pharmacy" : "Cashier"} Invoice Search</h2></div></div><div class="card"><div id="bs-tbl"></div></div>`;
  mountDataTable(container.querySelector("#bs-tbl"), {
    columns: [
      { key: "id", label: "Bill No" },
      { key: "billDate", label: "Date" },
      { key: "uhid", label: "UHID" },
      { key: "patientName", label: "Patient" },
      { key: "netAmount", label: "Net Total", render: (r) => money(r.netAmount ?? r.netTotal) },
      { key: "status", label: "Status" }
    ],
    rows,
    searchPlaceholder: "Search invoice no, patient, UHID..."
  });
}

async function renderDoctorPayouts(container, reportOnly) {
  const [payouts, masters] = await Promise.all([db.list("doctor_payouts"), db.list("masters")]);
  const doctors = masters.filter((m) => m.catalog === "Service Providers");

  container.innerHTML = `
    <div class="module-header"><div><h2>${reportOnly ? "Doctor Income Payout Report" : "Doctor Income Share &amp; TDS Payout"}</h2></div></div>
    ${!reportOnly ? `
    <div class="card">
      <form id="dp-form" class="form-grid">
        <div class="form-group"><label>Doctor</label><select name="doctorName">${doctors.map((d) => `<option>${esc(d.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Gross Consultation / Procedure Share (₹)</label><input name="grossAmount" type="number" min="1" required /></div>
        <div class="form-group"><label>TDS % (Sec 194J)</label><input name="tdsPct" type="number" value="10" /></div>
        <div class="form-actions" style="align-self:end;"><button type="submit" class="btn btn-success">Disburse Payout</button></div>
      </form>
    </div>` : ""}
    <div class="card"><div id="dp-tbl"></div></div>
  `;
  mountDataTable(container.querySelector("#dp-tbl"), {
    columns: [
      { key: "payoutDate", label: "Date" },
      { key: "doctorName", label: "Doctor" },
      { key: "grossAmount", label: "Gross", render: (r) => money(r.grossAmount) },
      { key: "tdsAmount", label: "TDS", render: (r) => money(r.tdsAmount) },
      { key: "netPaid", label: "Net Paid", render: (r) => money(r.netPaid) }
    ],
    rows: payouts,
    exportFileName: "doctor-payouts.csv",
    printTitle: "Doctor Income Payout Report"
  });
  if (!reportOnly) {
    container.querySelector("#dp-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const gross = Number(fd.get("grossAmount"));
      const tds = gross * (Number(fd.get("tdsPct") || 0) / 100);
      await db.add("doctor_payouts", {
        payoutDate: todayISO(),
        doctorName: fd.get("doctorName"),
        grossAmount: gross,
        tdsAmount: tds,
        netPaid: gross - tds,
        paidBy: auth.getCurrentUser().username
      });
      toast("Doctor payout recorded.", "success");
      renderDoctorPayouts(container, false);
    };
  }
}
