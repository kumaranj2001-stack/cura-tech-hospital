import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, fmtDateTime, flashToast, downloadCSV, today } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime } from "../utils/erpApi";
import {
  Landmark,
  Lock,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  group: string;
  balance: number;
  branchId?: string;
}

interface CashCloseEntry {
  id: string;
  branchId?: string;
  cashierName: string;
  date: string;
  shift: string;
  openingFloat: number;
  cashCollected: number;
  cardCollected: number;
  upiCollected: number;
  totalCollected: number;
  cashHandover: number;
  variance: number;
  status: string;
  verifiedBy?: string;
}

interface ExpenseEntry {
  id: string;
  voucherNumber: string;
  category: string;
  description: string;
  amount: number;
  paidTo: string;
  paymentMode: string;
  date: string;
  approvedBy?: string;
  status: string;
}

interface ReceivableEntry {
  id: string;
  billNumber: string;
  debtorName: string;
  category: string;
  amount: number;
  receivedAmount: number;
  balanceDue: number;
  claimDate: string;
  dueDate: string;
  status: string;
  referenceNumber?: string;
}

interface DoctorIncomeEntry {
  id: string;
  doctorId?: string;
  doctorName: string;
  department: string;
  month: string;
  totalConsultations: number;
  opdShareAmount: number;
  ipdProceduresAmount: number;
  grossPayable: number;
  tdsDeduction: number;
  netPaid: number;
  paymentDate: string;
  paymentMode: string;
  status: string;
  referenceNumber?: string;
}

const ACCOUNTS_TITLES: Record<string, string> = {
  final_cash_close: "Final Cash Close & Drawer Reconciliation",
  final_cash_close_log: "Cash Close Audit Log",
  add_accounts: "Chart of Accounts & General Ledgers",
  pending_expense: "Pending Expense Approvals",
  add_expenses: "Hospital Vouchers & Expenses Register",
  add_receivable: "Receivables & TPA Claim Tracking",
  transaction_report: "Consolidated Financial Transaction Report",
  expenses_report: "Categorized Expenditure Report",
  receivables_report: "Outstanding Receivables & Aging Report",
  accounts_audit: "Finance & Accounts Variance Audit",
  cashier_bill_search: "Cashier Receipt & Counter Bill Search",
  pharmacy_bill_search: "Pharmacy Invoice Bill Search",
  credit_pending_rep: "Credit & Insurance Pending Report",
  doctor_income_pay: "Consultant & Surgeon Income Settlement",
  doctor_income_rep: "Doctor Income & TDS Deduction Report",
};

export const AccountsERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "final_cash_close",
  dropdownOption,
}) => {
  const { data, currentBranch, viewBranchId, currentUser, log } = useStore();
  const currentBranchId = viewBranchId || currentBranch?.id || "br_main";
  const [activeTool, setActiveTool] = useState(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [cashCloseLogs, setCashCloseLogs] = useState<CashCloseEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [receivables, setReceivables] = useState<ReceivableEntry[]>([]);
  const [doctorIncomes, setDoctorIncomes] = useState<DoctorIncomeEntry[]>([]);
  const [cashierReceipts, setCashierReceipts] = useState<any[]>([]);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [receivableModalOpen, setReceivableModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  // Forms
  const [closeForm, setCloseForm] = useState({ shift: "Full Day", openingFloat: "2000", cashCollected: "14500", cardCollected: "18000", upiCollected: "12000", n500: "25", n200: "10", n100: "20" });
  const [accForm, setAccForm] = useState({ code: "", name: "", type: "Asset", group: "Bank Accounts", balance: "0" });
  const [expForm, setExpForm] = useState({ category: "Medical Supplies", description: "", amount: "", paidTo: "", paymentMode: "Bank Transfer", status: "paid" });
  const [recForm, setRecForm] = useState({ billNumber: "", debtorName: "", category: "TPA / Insurance", amount: "", dueDate: today(), referenceNumber: "" });
  const [payoutForm, setPayoutForm] = useState({ doctorName: "Dr. Arvind Sharma", department: "General Medicine", totalConsultations: "40", opdShareAmount: "20000", ipdProceduresAmount: "15000", paymentMode: "Bank Transfer", referenceNumber: "" });

  useEffect(() => {
    if (initialAction) setActiveTool(initialAction);
  }, [initialAction, dropdownOption]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const q = currentBranchId && currentBranchId !== "all" ? `?branchId=${encodeURIComponent(currentBranchId)}` : "";
      const [accRes, cashRes] = await Promise.all([erpGet(`/api/accounts${q}`), erpGet(`/api/cashier${q}`)]);
      setAccounts(accRes.accounts || []);
      setCashCloseLogs(accRes.cashCloseLogs || []);
      setExpenses(accRes.expenses || []);
      setReceivables(accRes.receivables || []);
      setDoctorIncomes(accRes.doctorIncomes || []);
      setCashierReceipts(cashRes.receipts || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed loading Accounts ERP", "warn");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useErpRealtime("accounts", loadAccounts);

  const countedCash = useMemo(() => Number(closeForm.n500) * 500 + Number(closeForm.n200) * 200 + Number(closeForm.n100) * 100, [closeForm]);
  const expectedCash = Number(closeForm.cashCollected) || 0;
  const variance = countedCash - expectedCash;

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const pendingExpCount = useMemo(() => expenses.filter((e) => e.status === "pending").length, [expenses]);
  const totalReceivableDue = useMemo(() => receivables.reduce((s, r) => s + (Number(r.balanceDue) || 0), 0), [receivables]);
  const totalDoctorPayout = useMemo(() => doctorIncomes.reduce((s, d) => s + (Number(d.netPaid) || 0), 0), [doctorIncomes]);

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalCollected = (Number(closeForm.cashCollected) || 0) + (Number(closeForm.cardCollected) || 0) + (Number(closeForm.upiCollected) || 0);
    try {
      await erpMutate("/api/cash-close", {
        action: "cash-close",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        cashierName: currentUser?.name || "Finance Desk",
        date: today(),
        shift: closeForm.shift,
        openingFloat: Number(closeForm.openingFloat) || 0,
        cashCollected: expectedCash,
        cardCollected: Number(closeForm.cardCollected) || 0,
        upiCollected: Number(closeForm.upiCollected) || 0,
        totalCollected,
        cashHandover: countedCash,
        variance,
        denominations: { "500": Number(closeForm.n500), "200": Number(closeForm.n200), "100": Number(closeForm.n100) },
        status: variance === 0 ? "verified" : "flagged",
        verifiedBy: currentUser?.name || "Chief Accountant",
      });
      log("FINAL_CASH_CLOSE", `Submitted ${closeForm.shift} close: Handover ${fmtCurrency(countedCash)}, variance ${fmtCurrency(variance)}`);
      await loadAccounts();
      flashToast("Final Cash Close logged cleanly", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Cash close failed", "warn");
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.name.trim()) return flashToast("Ledger name required", "warn");
    try {
      await erpMutate("/api/accounts", {
        action: "account",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        code: accForm.code || String(1000 + accounts.length * 10),
        name: accForm.name.trim(),
        type: accForm.type,
        group: accForm.group,
        balance: Number(accForm.balance) || 0,
      });
      setAccountModalOpen(false);
      setAccForm({ code: "", name: "", type: "Asset", group: "Bank Accounts", balance: "0" });
      await loadAccounts();
      flashToast("General Ledger account created", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed adding account", "warn");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.description.trim() || !(Number(expForm.amount) > 0)) return flashToast("Description and valid amount required", "warn");
    try {
      await erpMutate("/api/accounts", {
        action: "expense",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        ...expForm,
        amount: Number(expForm.amount),
        approvedBy: expForm.status === "paid" ? currentUser?.name || "Admin" : "Pending",
      });
      setExpenseModalOpen(false);
      setExpForm({ category: "Medical Supplies", description: "", amount: "", paidTo: "", paymentMode: "Bank Transfer", status: "paid" });
      await loadAccounts();
      flashToast("Expense voucher recorded", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed saving expense", "warn");
    }
  };

  const handleApproveExpense = async (exp: ExpenseEntry) => {
    try {
      await erpMutate("/api/accounts", { action: "expense", id: exp.id, status: "paid", approvedBy: currentUser?.name || "Accountant" }, "PUT");
      await loadAccounts();
      flashToast(`Approved & settled ${exp.voucherNumber}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Approval failed", "warn");
    }
  };

  const handleAddReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(recForm.amount) || 0;
    if (!recForm.debtorName.trim() || amount <= 0) return flashToast("Debtor name and valid amount required", "warn");
    try {
      await erpMutate("/api/accounts", {
        action: "receivable",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        billNumber: recForm.billNumber || `CLM-${Date.now().toString().slice(-4)}`,
        debtorName: recForm.debtorName.trim(),
        category: recForm.category,
        amount,
        receivedAmount: 0,
        balanceDue: amount,
        dueDate: recForm.dueDate,
        status: "pending",
        referenceNumber: recForm.referenceNumber,
      });
      setReceivableModalOpen(false);
      setRecForm({ billNumber: "", debtorName: "", category: "TPA / Insurance", amount: "", dueDate: today(), referenceNumber: "" });
      await loadAccounts();
      flashToast("Receivable claim created", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed saving receivable", "warn");
    }
  };

  const handleSettleReceivable = async (r: ReceivableEntry) => {
    try {
      await erpMutate("/api/accounts", { action: "receivable", id: r.id, receivedAmount: r.amount, balanceDue: 0, status: "settled" }, "PUT");
      await loadAccounts();
      flashToast(`Settled ${r.billNumber}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Settlement failed", "warn");
    }
  };

  const handlePayDoctorIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const opd = Number(payoutForm.opdShareAmount) || 0;
    const ipd = Number(payoutForm.ipdProceduresAmount) || 0;
    const grossPayable = opd + ipd;
    const tdsDeduction = Math.round(grossPayable * 0.1);
    const netPaid = grossPayable - tdsDeduction;
    if (grossPayable <= 0) return flashToast("Enter positive OPD or IPD share amount", "warn");
    try {
      await erpMutate("/api/accounts", {
        action: "doctor-income",
        doctorName: payoutForm.doctorName,
        department: payoutForm.department,
        month: today().slice(0, 7),
        totalConsultations: Number(payoutForm.totalConsultations) || 0,
        opdShareAmount: opd,
        ipdProceduresAmount: ipd,
        grossPayable,
        tdsDeduction,
        netPaid,
        paymentMode: payoutForm.paymentMode,
        referenceNumber: payoutForm.referenceNumber || `NEFT-${Date.now().toString().slice(-6)}`,
        status: "paid",
      });
      setPayoutModalOpen(false);
      await loadAccounts();
      flashToast(`Disbursed ${fmtCurrency(netPaid)} (Net after 10% TDS) to ${payoutForm.doctorName}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Doctor payout failed", "warn");
    }
  };

  const filteredPharmacyBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (data.invoices || []).filter((inv) => !q || `${inv.number} ${inv.patientName} ${inv.patientPhone || ""}`.toLowerCase().includes(q));
  }, [data.invoices, searchQuery]);

  const filteredCashierBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cashierReceipts.filter((r) => !q || `${r.receiptNumber} ${r.patientName} ${r.department}`.toLowerCase().includes(q));
  }, [cashierReceipts, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{ACCOUNTS_TITLES[activeTool] || "Finance & General Ledger"}</h1>
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Double-entry general ledger, TPA receivables, expense vouchers & physician TDS settlements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadAccounts}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="secondary" size="sm" onClick={() => setExpenseModalOpen(true)}><TrendingDown className="w-4 h-4" /> Add Expense</Button>
          <Button variant="primary" size="sm" onClick={() => setReceivableModalOpen(true)}><TrendingUp className="w-4 h-4" /> Add Receivable</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Cash Close Logs</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{cashCloseLogs.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Expenses</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{fmtCurrency(totalExpenses)}</div>
          <div className="text-xs text-slate-400">{pendingExpCount} pending approval</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Receivables Due</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{fmtCurrency(totalReceivableDue)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Doctor Payouts (Net)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{fmtCurrency(totalDoctorPayout)}</div>
        </Card>
      </div>

      {/* Views */}
      {activeTool === "final_cash_close" ? (
        <Card>
          <CardHeader title="End-of-Shift Cash Counter Denomination & Closing" subtitle="Verify physical currency notes against POS cash collections" />
          <CardBody>
            <form onSubmit={handleCloseDay} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Shift</Label>
                    <Select value={closeForm.shift} onChange={(e) => setCloseForm({ ...closeForm, shift: e.target.value })}>
                      <option value="Full Day">Full Day</option>
                      <option value="Morning Shift">Morning Shift</option>
                      <option value="Evening Shift">Evening Shift</option>
                    </Select>
                  </div>
                  <div><Label>Opening Float (INR)</Label><Input type="number" value={closeForm.openingFloat} onChange={(e) => setCloseForm({ ...closeForm, openingFloat: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Cash System Total</Label><Input type="number" value={closeForm.cashCollected} onChange={(e) => setCloseForm({ ...closeForm, cashCollected: e.target.value })} /></div>
                  <div><Label>Card POS</Label><Input type="number" value={closeForm.cardCollected} onChange={(e) => setCloseForm({ ...closeForm, cardCollected: e.target.value })} /></div>
                  <div><Label>UPI / QR</Label><Input type="number" value={closeForm.upiCollected} onChange={(e) => setCloseForm({ ...closeForm, upiCollected: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div><Label>500 Notes</Label><Input type="number" value={closeForm.n500} onChange={(e) => setCloseForm({ ...closeForm, n500: e.target.value })} /></div>
                  <div><Label>200 Notes</Label><Input type="number" value={closeForm.n200} onChange={(e) => setCloseForm({ ...closeForm, n200: e.target.value })} /></div>
                  <div><Label>100 Notes</Label><Input type="number" value={closeForm.n100} onChange={(e) => setCloseForm({ ...closeForm, n100: e.target.value })} /></div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Physical Counted Cash:</span><strong className="text-lg">{fmtCurrency(countedCash)}</strong></div>
                  <div className="flex justify-between"><span>System Cash Expected:</span><strong>{fmtCurrency(expectedCash)}</strong></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Cash Variance:</span>
                    <Badge tone={variance === 0 ? "green" : "red"}>{variance === 0 ? "Balanced (0)" : fmtCurrency(variance)}</Badge>
                  </div>
                </div>
                <Button type="submit" variant="danger" className="w-full"><Lock className="w-4 h-4" /> Submit Final Cash Close</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : activeTool === "final_cash_close_log" ? (
        <Card>
          <CardHeader title="Final Cash Close Audit History" right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("cash_close_log.csv", cashCloseLogs as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>} />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Date</Th><Th>Cashier</Th><Th>Shift</Th><Th className="text-right">Cash</Th><Th className="text-right">Card + UPI</Th><Th className="text-right">Variance</Th><Th>Status</Th></tr></thead>
              <tbody>
                {cashCloseLogs.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td>{c.date}</Td><Td className="font-semibold">{c.cashierName}</Td><Td>{c.shift}</Td>
                    <Td className="text-right">{fmtCurrency(c.cashCollected)}</Td>
                    <Td className="text-right">{fmtCurrency((c.cardCollected || 0) + (c.upiCollected || 0))}</Td>
                    <Td className="text-right"><Badge tone={c.variance === 0 ? "green" : "red"}>{fmtCurrency(c.variance)}</Badge></Td>
                    <Td><Badge tone={c.status === "verified" ? "green" : "amber"}>{c.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "add_accounts" ? (
        <Card>
          <CardHeader title="Chart of Accounts" right={<Button size="sm" onClick={() => setAccountModalOpen(true)}><Plus className="w-3.5 h-3.5" /> New Ledger Account</Button>} />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Code</Th><Th>Account Name</Th><Th>Type</Th><Th>Group</Th><Th className="text-right">Closing Balance</Th></tr></thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{a.code}</Td><Td className="font-semibold">{a.name}</Td>
                    <Td><Badge tone="blue">{a.type}</Badge></Td><Td>{a.group}</Td>
                    <Td className="text-right font-bold">{fmtCurrency(a.balance)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "pending_expense" || activeTool === "add_expenses" || activeTool === "expenses_report" ? (
        <Card>
          <CardHeader
            title={ACCOUNTS_TITLES[activeTool]}
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("expenses_register.csv", expenses as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" onClick={() => setExpenseModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Expense</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Voucher #</Th><Th>Category</Th><Th>Description</Th><Th>Paid To</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Amount</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {expenses
                  .filter((ex) => (activeTool === "pending_expense" ? ex.status === "pending" : true))
                  .map((ex) => (
                    <tr key={ex.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{ex.voucherNumber}</Td><Td>{ex.category}</Td>
                      <Td className="font-medium">{ex.description}</Td><Td>{ex.paidTo}</Td><Td>{ex.date}</Td>
                      <Td><Badge tone={ex.status === "paid" ? "green" : "amber"}>{ex.status}</Badge></Td>
                      <Td className="text-right font-bold">{fmtCurrency(ex.amount)}</Td>
                      <Td className="text-right">
                        {ex.status === "pending" && (
                          <Button size="sm" variant="success" onClick={() => handleApproveExpense(ex)}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "add_receivable" || activeTool === "receivables_report" || activeTool === "credit_pending_rep" ? (
        <Card>
          <CardHeader
            title={ACCOUNTS_TITLES[activeTool]}
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("receivables.csv", receivables as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" onClick={() => setReceivableModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Receivable</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Bill / Claim #</Th><Th>Debtor / Insurance TPA</Th><Th>Category</Th><Th>Due Date</Th><Th className="text-right">Total</Th><Th className="text-right">Balance Due</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {receivables
                  .filter((r) => (activeTool === "credit_pending_rep" ? r.status !== "settled" : true))
                  .map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{r.billNumber}</Td><Td className="font-semibold">{r.debtorName}</Td>
                      <Td>{r.category}</Td><Td>{r.dueDate}</Td>
                      <Td className="text-right">{fmtCurrency(r.amount)}</Td>
                      <Td className="text-right font-bold text-rose-600">{fmtCurrency(r.balanceDue)}</Td>
                      <Td><Badge tone={r.status === "settled" ? "green" : r.status === "partial" ? "amber" : "red"}>{r.status}</Badge></Td>
                      <Td className="text-right">
                        {r.status !== "settled" && <Button size="sm" variant="success" onClick={() => handleSettleReceivable(r)}>Settle Full</Button>}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "cashier_bill_search" ? (
        <Card>
          <CardHeader
            title="Cashier Bill & Receipt Search"
            right={<Input placeholder="Search receipt #, patient, dept..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64" />}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Receipt #</Th><Th>Patient</Th><Th>Department</Th><Th>Mode</Th><Th>Date</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {filteredCashierBills.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{r.receiptNumber}</Td><Td className="font-semibold">{r.patientName}</Td>
                    <Td>{r.department}</Td><Td><Badge tone="blue">{r.paymentMode}</Badge></Td><Td className="text-xs">{fmtDateTime(r.date)}</Td>
                    <Td className="text-right font-bold">{fmtCurrency(r.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "pharmacy_bill_search" ? (
        <Card>
          <CardHeader
            title="Pharmacy Invoice Search"
            right={<Input placeholder="Search invoice #, patient, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64" />}
          />
          <CardBody className="p-0 overflow-x-auto">
            {filteredPharmacyBills.length === 0 ? (
              <EmptyState icon="💊" title="No matching pharmacy bills" sub="Try clearing the filter or creating a dispensing bill." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr><Th>Invoice #</Th><Th>Patient</Th><Th>Items</Th><Th>Payment</Th><Th>Date</Th><Th className="text-right">Total</Th></tr></thead>
                <tbody>
                  {filteredPharmacyBills.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{inv.number}</Td><Td className="font-semibold">{inv.patientName}</Td>
                      <Td>{inv.items?.length || 0} line(s)</Td><Td><Badge tone="blue">{inv.paymentMethod}</Badge></Td>
                      <Td className="text-xs">{fmtDateTime(inv.date)}</Td><Td className="text-right font-bold">{fmtCurrency(inv.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : activeTool === "doctor_income_pay" || activeTool === "doctor_income_rep" ? (
        <Card>
          <CardHeader
            title="Doctor Professional Fee Settlement & TDS Register"
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("doctor_income_tds.csv", doctorIncomes as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" variant="success" onClick={() => setPayoutModalOpen(true)}><DollarSign className="w-3.5 h-3.5" /> New Payout</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Consultant</Th><Th>Department</Th><Th>Month</Th><Th className="text-right">Gross</Th><Th className="text-right">TDS (10%)</Th><Th className="text-right">Net Paid</Th><Th>Reference</Th></tr></thead>
              <tbody>
                {doctorIncomes.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold">{d.doctorName}</Td><Td>{d.department}</Td><Td>{d.month}</Td>
                    <Td className="text-right">{fmtCurrency(d.grossPayable)}</Td>
                    <Td className="text-right text-amber-600">-{fmtCurrency(d.tdsDeduction)}</Td>
                    <Td className="text-right font-bold text-emerald-600">{fmtCurrency(d.netPaid)}</Td>
                    <Td className="font-mono text-xs">{d.referenceNumber}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : (
        /* transaction_report & accounts_audit */
        <Card>
          <CardHeader
            title={ACCOUNTS_TITLES[activeTool] || "Financial Transaction Register"}
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("accounts_transactions.csv", [...expenses, ...receivables] as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Source Module</Th><Th>Ref / Voucher</Th><Th>Party</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td><Badge tone="amber">Expense</Badge></Td><Td className="font-mono text-xs">{e.voucherNumber}</Td>
                    <Td>{e.paidTo}</Td><Td>{e.date}</Td><Td><Badge tone={e.status === "paid" ? "green" : "amber"}>{e.status}</Badge></Td>
                    <Td className="text-right font-bold text-rose-600">-{fmtCurrency(e.amount)}</Td>
                  </tr>
                ))}
                {receivables.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td><Badge tone="blue">Receivable</Badge></Td><Td className="font-mono text-xs">{r.billNumber}</Td>
                    <Td>{r.debtorName}</Td><Td>{r.claimDate}</Td><Td><Badge tone={r.status === "settled" ? "green" : "amber"}>{r.status}</Badge></Td>
                    <Td className="text-right font-bold text-emerald-600">+{fmtCurrency(r.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <Modal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} title="Create General Ledger Account">
        <form onSubmit={handleAddAccount} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Account Code</Label><Input value={accForm.code} onChange={(e) => setAccForm({ ...accForm, code: e.target.value })} placeholder="1030" /></div>
            <div>
              <Label>Type</Label>
              <Select value={accForm.type} onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}>
                <option value="Asset">Asset</option><option value="Liability">Liability</option><option value="Income">Income</option><option value="Expense">Expense</option>
              </Select>
            </div>
          </div>
          <div><Label>Account Name</Label><Input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ledger Group</Label><Input value={accForm.group} onChange={(e) => setAccForm({ ...accForm, group: e.target.value })} /></div>
            <div><Label>Opening Balance</Label><Input type="number" value={accForm.balance} onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAccountModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Ledger</Button>
          </div>
        </form>
      </Modal>

      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Record Hospital Expense Voucher">
        <form onSubmit={handleAddExpense} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} /></div>
            <div><Label>Amount (INR)</Label><Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} required /></div>
          </div>
          <div><Label>Description</Label><Input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Paid To / Vendor</Label><Input value={expForm.paidTo} onChange={(e) => setExpForm({ ...expForm, paidTo: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={expForm.status} onChange={(e) => setExpForm({ ...expForm, status: e.target.value })}>
                <option value="paid">Paid Immediately</option><option value="pending">Submit for Approval</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Voucher</Button>
          </div>
        </form>
      </Modal>

      <Modal open={receivableModalOpen} onClose={() => setReceivableModalOpen(false)} title="Add TPA / Corporate Receivable">
        <form onSubmit={handleAddReceivable} className="space-y-3">
          <div><Label>Debtor / TPA Name</Label><Input value={recForm.debtorName} onChange={(e) => setRecForm({ ...recForm, debtorName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Claim / Bill #</Label><Input value={recForm.billNumber} onChange={(e) => setRecForm({ ...recForm, billNumber: e.target.value })} /></div>
            <div><Label>Claim Amount (INR)</Label><Input type="number" value={recForm.amount} onChange={(e) => setRecForm({ ...recForm, amount: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={recForm.category} onChange={(e) => setRecForm({ ...recForm, category: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={recForm.dueDate} onChange={(e) => setRecForm({ ...recForm, dueDate: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setReceivableModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Receivable</Button>
          </div>
        </form>
      </Modal>

      <Modal open={payoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Disburse Doctor Revenue Share (Auto 10% TDS)">
        <form onSubmit={handlePayDoctorIncome} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Consultant Name</Label><Input value={payoutForm.doctorName} onChange={(e) => setPayoutForm({ ...payoutForm, doctorName: e.target.value })} required /></div>
            <div><Label>Department</Label><Input value={payoutForm.department} onChange={(e) => setPayoutForm({ ...payoutForm, department: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>OPD Share (INR)</Label><Input type="number" value={payoutForm.opdShareAmount} onChange={(e) => setPayoutForm({ ...payoutForm, opdShareAmount: e.target.value })} /></div>
            <div><Label>IPD Procedure Share (INR)</Label><Input type="number" value={payoutForm.ipdProceduresAmount} onChange={(e) => setPayoutForm({ ...payoutForm, ipdProceduresAmount: e.target.value })} /></div>
          </div>
          <div><Label>NEFT / Bank Reference</Label><Input value={payoutForm.referenceNumber} onChange={(e) => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })} placeholder="Auto-generated if blank" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setPayoutModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="success">Settle Doctor Payout</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
