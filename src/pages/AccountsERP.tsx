import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { CashCloseRecord, AccountExpense, AccountReceivable, DoctorIncomeRecord } from "../store/types";
import {
  Landmark,
  Lock,
  History,
  PlusCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Search,
  Pill,
  AlertCircle,
  DollarSign,
  FileText,
  CheckCircle2,
  Download,
  Calculator,
} from "lucide-react";

export const AccountsERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "final_cash_close" }) => {
  const { data, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeTool, setActiveTool] = useState<string>(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [receivableModalOpen, setReceivableModalOpen] = useState(false);

  // Cash Close Denominations state
  const [denominations, setDenominations] = useState<Record<string, number>>({
    "500": 18,
    "200": 12,
    "100": 25,
    "50": 10,
    "20": 15,
    "10": 20,
  });

  const physicalCashCount = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [denominations]);

  const systemCashExpected = 14500;
  const cashVariance = physicalCashCount - systemCashExpected;

  // Cash Close History Log
  const [cashCloseLogs, setCashCloseLogs] = useState<CashCloseRecord[]>([
    {
      id: "cc_1",
      branchId,
      cashierId: "u_cashier1",
      cashierName: "Sivakumar (Counter 1)",
      date: "2026-11-23",
      shift: "Full Day",
      openingFloat: 2000,
      cashCollected: 14500,
      cardCollected: 32000,
      upiCollected: 18500,
      totalCollected: 65000,
      cashHandover: 14500,
      variance: 0,
      denominations: { "500": 20, "200": 15, "100": 15 },
      status: "verified",
      verifiedBy: "Chief Accountant",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cc_2",
      branchId,
      cashierId: "u_cashier2",
      cashierName: "Meena R (Counter 2)",
      date: "2026-11-22",
      shift: "Evening",
      openingFloat: 2000,
      cashCollected: 11200,
      cardCollected: 24000,
      upiCollected: 15400,
      totalCollected: 50600,
      cashHandover: 11200,
      variance: 0,
      denominations: { "500": 16, "200": 10, "100": 12 },
      status: "verified",
      verifiedBy: "Chief Accountant",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Expenses state
  const [expenses, setExpenses] = useState<AccountExpense[]>([
    {
      id: "exp_1",
      voucherNumber: "VCH-2026-081",
      category: "Medical Supplies",
      description: "Emergency Oxygen Cylinder Refill Batch (10 Cylinders)",
      amount: 4500,
      paidTo: "Southern Gas Agency",
      paymentMode: "Bank Transfer",
      date: "2026-11-22",
      approvedBy: "Admin Kumaran",
      status: "paid",
      createdAt: new Date().toISOString(),
    },
    {
      id: "exp_2",
      voucherNumber: "VCH-2026-082",
      category: "Utilities",
      description: "Hospital Diesel Generator Fuel (500 Liters)",
      amount: 48000,
      paidTo: "Indian Oil Fuel Depot",
      paymentMode: "UPI",
      date: "2026-11-23",
      approvedBy: "Admin Kumaran",
      status: "paid",
      createdAt: new Date().toISOString(),
    },
    {
      id: "exp_3",
      voucherNumber: "VCH-2026-083",
      category: "Petty Cash",
      description: "Patient Front-Desk Drinking Water & Housekeeping Supplies",
      amount: 1250,
      paidTo: "Metro Refreshments",
      paymentMode: "Cash",
      date: "2026-11-24",
      approvedBy: "Cashier",
      status: "paid",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Receivables state
  const [receivables, setReceivables] = useState<AccountReceivable[]>([
    {
      id: "rec_1",
      billNumber: "CLM-TPA-9012",
      debtorName: "Star Health & Allied Insurance",
      category: "TPA / Insurance",
      amount: 85000,
      receivedAmount: 60000,
      balanceDue: 25000,
      claimDate: "2026-11-15",
      dueDate: "2026-12-15",
      status: "partial",
      referenceNumber: "STAR-CLM-88912",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rec_2",
      billNumber: "CORP-9812",
      debtorName: "L&T Construction Health Scheme",
      category: "Corporate Tie-up",
      amount: 42000,
      receivedAmount: 0,
      balanceDue: 42000,
      claimDate: "2026-11-18",
      dueDate: "2026-12-18",
      status: "pending",
      referenceNumber: "LT-CORP-401",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Doctor Income Payouts
  const [doctorIncomes, setDoctorIncomes] = useState<DoctorIncomeRecord[]>([
    {
      id: "di_1",
      doctorId: "doc_1",
      doctorName: "Dr. Arvind Sharma",
      department: "General Medicine",
      month: "2026-11",
      totalConsultations: 142,
      opdShareAmount: 42600,
      ipdProceduresAmount: 28000,
      grossPayable: 70600,
      tdsDeduction: 7060,
      netPaid: 63540,
      paymentDate: "2026-11-20",
      paymentMode: "Bank Transfer",
      status: "paid",
      referenceNumber: "NEFT-HDFC-9912048",
    },
    {
      id: "di_2",
      doctorId: "doc_2",
      doctorName: "Dr. Priya Raman",
      department: "Pediatrics",
      month: "2026-11",
      totalConsultations: 98,
      opdShareAmount: 29400,
      ipdProceduresAmount: 15000,
      grossPayable: 44400,
      tdsDeduction: 4440,
      netPaid: 39960,
      paymentDate: "2026-11-20",
      paymentMode: "Bank Transfer",
      status: "paid",
      referenceNumber: "NEFT-HDFC-9912049",
    },
  ]);

  // Expense Form
  const [newExpenseForm, setNewExpenseForm] = useState({
    category: "Medical Supplies" as any,
    description: "",
    amount: "1500",
    paidTo: "",
    paymentMode: "Cash" as any,
  });

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseForm.description.trim() || !newExpenseForm.paidTo.trim()) {
      flashToast("Please fill in description and payee", "warn");
      return;
    }

    const newVoucher: AccountExpense = {
      id: "exp_" + Date.now(),
      voucherNumber: `VCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      category: newExpenseForm.category,
      description: newExpenseForm.description.trim(),
      amount: Number(newExpenseForm.amount) || 0,
      paidTo: newExpenseForm.paidTo.trim(),
      paymentMode: newExpenseForm.paymentMode,
      date: new Date().toISOString().slice(0, 10),
      approvedBy: currentUser?.username || "Admin",
      status: "paid",
      createdAt: new Date().toISOString(),
    };

    setExpenses([newVoucher, ...expenses]);
    log("EXPENSE_RECORDED", `Voucher ${newVoucher.voucherNumber} for ₹${newVoucher.amount} to ${newVoucher.paidTo}`);
    flashToast(`Expense voucher ${newVoucher.voucherNumber} recorded!`);
    setExpenseModalOpen(false);
  };

  const handleFinalCashClose = () => {
    const newClose: CashCloseRecord = {
      id: "cc_" + Date.now(),
      branchId,
      cashierId: currentUser?.id || "u_cashier",
      cashierName: currentUser?.name || "Shift Cashier",
      date: new Date().toISOString().slice(0, 10),
      shift: "Full Day",
      openingFloat: 2000,
      cashCollected: physicalCashCount,
      cardCollected: 32000,
      upiCollected: 18500,
      totalCollected: physicalCashCount + 32000 + 18500,
      cashHandover: physicalCashCount,
      variance: cashVariance,
      denominations: { ...denominations },
      status: "verified",
      verifiedBy: "Chief Financial Accountant",
      notes: cashVariance === 0 ? "Drawer perfectly balanced" : `Variance of ₹${cashVariance}`,
      createdAt: new Date().toISOString(),
    };

    setCashCloseLogs([newClose, ...cashCloseLogs]);
    log("CASH_CLOSE_FINALIZED", `Closed drawer with physical cash ₹${physicalCashCount} (Variance: ₹${cashVariance})`);
    flashToast(`Cash Close finalized! Handover amount: ₹${physicalCashCount.toLocaleString()}`);
    setActiveTool("final_cash_close_log");
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/30 text-blue-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-400/40">
              Hospital Financial Accounts & Auditing
            </span>
            <span className="text-xs text-blue-200">Cash Close · General Ledger · Doctor Payouts</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Accounts & Financial Governance</h1>
          <p className="text-blue-100/80 text-sm max-w-xl">
            Execute final shift cash close reconciliation, log operating expenses, manage corporate TPA receivables, calculate doctor TDS payouts, and search hospital bill registers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-md"
            onClick={() => setExpenseModalOpen(true)}
          >
            <ArrowDownCircle className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => setActiveTool("final_cash_close")}
          >
            <Lock className="w-4 h-4 mr-1 text-emerald-300" />
            Final Cash Close
          </Button>
        </div>
      </div>

      {/* Tool Navigation Switcher */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs overflow-x-auto">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-slate-400 font-mono uppercase">ACTIVE TOOL:</span>
          <span className="bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md font-bold shadow-xs">
            {activeTool.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool("final_cash_close")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-medium"
          >
            Cash Close
          </button>
          <button
            onClick={() => setActiveTool("final_cash_close_log")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-medium"
          >
            Close Logs
          </button>
          <button
            onClick={() => setActiveTool("expenses_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-medium"
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTool("receivables_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-medium"
          >
            Receivables
          </button>
          <button
            onClick={() => setActiveTool("doctor_income_pay")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-medium"
          >
            Doctor Incomes
          </button>
        </div>
      </div>

      {/* ── TOOL VIEW: Final Cash Close ── */}
      {activeTool === "final_cash_close" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Final Cash Drawer Close & Physical Currency Tally
            </h2>
            <p className="text-xs text-slate-500">
              Input physical currency denominations to balance cashier handover against system calculated revenue.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Denominations Input */}
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  PHYSICAL DENOMINATION COUNT
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {Object.entries(denominations).map(([denom, count]) => (
                    <div key={denom} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-slate-500 font-mono">
                        <span>₹{denom} Notes</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ₹{(Number(denom) * (Number(count) || 0)).toLocaleString()}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={count}
                        onChange={(e) =>
                          setDenominations({ ...denominations, [denom]: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        className="mt-1 text-xs py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Reconciliation Summary Box */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400">
                    CASH DRAWER RECONCILIATION
                  </span>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Physical Cash Counted:</span>
                      <span className="font-mono font-bold text-base text-white">
                        ₹{physicalCashCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>System Recorded Cash:</span>
                      <span className="font-mono font-bold text-base text-slate-300">
                        ₹{systemCashExpected.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-bold">
                      <span>Reconciliation Variance:</span>
                      <span
                        className={`font-mono text-base ${
                          cashVariance === 0 ? "text-emerald-400" : cashVariance > 0 ? "text-sky-400" : "text-rose-400"
                        }`}
                      >
                        {cashVariance === 0 ? "₹0 (BALANCED)" : `₹${cashVariance.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <Button
                    onClick={handleFinalCashClose}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm & Seal Final Cash Close
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Cash Close Logs ── */}
      {activeTool === "final_cash_close_log" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Historical Cash Close & Handover Audit Register
            </h2>
            <p className="text-xs text-slate-500">Official log of daily cash close reconciliations and verifications.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Date & Shift</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4 text-right">Cash Handover</th>
                    <th className="py-3 px-4 text-right">Card / Digital</th>
                    <th className="py-3 px-4 text-right">Total Shift Revenue</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4">Status & Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {cashCloseLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {fmtDate(log.date)} ({log.shift})
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">{log.cashierName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{log.cashHandover.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        ₹{(log.cardCollected + log.upiCollected).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                        ₹{log.totalCollected.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={log.variance === 0 ? "text-emerald-600 font-bold" : "text-rose-600"}>
                          ₹{log.variance}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone="green">Verified Closed</Badge>
                        <div className="text-[10px] text-slate-400 mt-0.5">{log.verifiedBy}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Expenses Report ── */}
      {(activeTool === "expenses_report" || activeTool === "add_expenses" || activeTool === "pending_expense") && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Hospital Operating Expenses & Petty Cash Register
              </h2>
              <p className="text-xs text-slate-500">Utilities, oxygen refills, generator fuel, housekeeping, and vendor payments.</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => setExpenseModalOpen(true)}>
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Record Expense
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Paid To</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {exp.voucherNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">{exp.category}</td>
                      <td className="py-3 px-4 max-w-xs text-slate-800 dark:text-slate-200">{exp.description}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{exp.paidTo}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{exp.paymentMode}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{exp.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(exp.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Receivables Report ── */}
      {(activeTool === "receivables_report" || activeTool === "add_receivable" || activeTool === "credit_pending_rep") && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Corporate & TPA Insurance Accounts Receivable
            </h2>
            <p className="text-xs text-slate-500">Aging of claims submitted to healthcare TPAs and corporate tie-ups.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Claim Bill #</th>
                    <th className="py-3 px-4">Debtor Entity</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Claim Amount</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {receivables.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{rec.billNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{rec.debtorName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{rec.category}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{rec.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">₹{rec.receivedAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                        ₹{rec.balanceDue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={rec.status === "settled" ? "green" : "amber"}>{rec.status.toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Doctor Income Payment & TDS ── */}
      {(activeTool === "doctor_income_pay" || activeTool === "doctor_income_rep") && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Consultant Physician Revenue Share & TDS Deductions
            </h2>
            <p className="text-xs text-slate-500">Monthly consultation fee distributions, surgical procedure shares, and statutory TDS compliance.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Physician & Dept</th>
                    <th className="py-3 px-4 text-center">Consultations</th>
                    <th className="py-3 px-4 text-right">OPD Share</th>
                    <th className="py-3 px-4 text-right">IPD Share</th>
                    <th className="py-3 px-4 text-right">Gross Earnings</th>
                    <th className="py-3 px-4 text-right">TDS (10%)</th>
                    <th className="py-3 px-4 text-right">Net Disbursed</th>
                    <th className="py-3 px-4">Payment Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {doctorIncomes.map((di) => (
                    <tr key={di.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{di.doctorName}</div>
                        <div className="text-[11px] text-slate-400">{di.department}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{di.totalConsultations}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{di.opdShareAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{di.ipdProceduresAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">₹{di.grossPayable.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-500">-₹{di.tdsDeduction.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{di.netPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div>{di.paymentMode}</div>
                        <div className="text-slate-400">{di.referenceNumber}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── MODAL: Add Expense Voucher ── */}
      <Modal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Record Hospital Operational Expense Voucher"
        size="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <Label>Expense Category</Label>
            <Select
              value={newExpenseForm.category}
              onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
            >
              <option value="Medical Supplies">Medical Supplies & Reagents</option>
              <option value="Utilities">Utilities & Fuel (Generator/Electricity)</option>
              <option value="Maintenance">Biomedical & Facility Repairs</option>
              <option value="Salaries">Staff / Nurse Salaries</option>
              <option value="Petty Cash">Petty Cash & Housekeeping</option>
              <option value="Office Expense">Hospital Stationery & Software</option>
            </Select>
          </div>

          <div>
            <Label>Payee / Vendor Name *</Label>
            <Input
              required
              value={newExpenseForm.paidTo}
              onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paidTo: e.target.value })}
              placeholder="e.g. Southern Gas Agency"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                required
                value={newExpenseForm.amount}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select
                value={newExpenseForm.paymentMode}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paymentMode: e.target.value as any })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Expense Description & Justification *</Label>
            <Input
              required
              value={newExpenseForm.description}
              onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
              placeholder="e.g. Liquid medical oxygen tank refill (2000L)"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Save Expense Voucher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AccountsERP;
