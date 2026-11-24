import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import {
  Receipt,
  LayoutDashboard,
  Clock,
  CalendarCheck,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  PieChart,
  Layers,
  Percent,
  AlertCircle,
  Users,
  Stethoscope,
  XCircle,
  Banknote,
  Landmark,
  Search,
  Plus,
  Printer,
  CreditCard,
  CheckCircle2,
  Download,
} from "lucide-react";

export const CashierERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "cashier_dashboard", dropdownOption }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeTool, setActiveTool] = useState<string>(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);

  // In-memory receipts for cashier ledger
  const [receipts, setReceipts] = useState([
    {
      id: "rcpt_1",
      receiptNumber: "RCPT-2026-1082",
      patientName: "Kavitha Sundar",
      patientUhid: "CURA-2026-089",
      department: "Inpatient IPD",
      amount: 14500,
      paymentMode: "UPI / QR",
      refNo: "UPI-984210984",
      cashier: "Cashier Desk 1",
      date: new Date().toISOString(),
      type: "Discharge Settlement",
    },
    {
      id: "rcpt_2",
      receiptNumber: "RCPT-2026-1083",
      patientName: "Arunachalam P",
      patientUhid: "CURA-2026-104",
      department: "OPD Consultation",
      amount: 500,
      paymentMode: "Cash",
      refNo: "CASH-SLIP-091",
      cashier: "Cashier Desk 1",
      date: new Date().toISOString(),
      type: "Doctor Consultation Fee",
    },
    {
      id: "rcpt_3",
      receiptNumber: "RCPT-2026-1084",
      patientName: "Deepak Sharma",
      patientUhid: "CURA-2026-042",
      department: "Diagnostic Lab",
      amount: 1850,
      paymentMode: "Credit Card",
      refNo: "POS-TXN-44910",
      cashier: "Cashier Desk 2",
      date: new Date().toISOString(),
      type: "Lab Investigation Package",
    },
    {
      id: "rcpt_4",
      receiptNumber: "RCPT-2026-1085",
      patientName: "Sanjay Natarajan",
      patientUhid: "CURA-2026-077",
      department: "Emergency Triage",
      amount: 3500,
      paymentMode: "Cash",
      refNo: "EMG-DEP-102",
      cashier: "Cashier Desk 1",
      date: new Date().toISOString(),
      type: "Emergency Observation Deposit",
    },
  ]);

  // Pre-Bookings state
  const [preBookings, setPreBookings] = useState([
    { id: "pb_1", patientName: "Ananya Iyer", procedure: "Laparoscopic Cholecystectomy", advancePaid: 10000, surgeryDate: "2026-11-28", surgeon: "Dr. Arvind Sharma" },
    { id: "pb_2", patientName: "Vijay Anand", procedure: "Total Knee Replacement", advancePaid: 25000, surgeryDate: "2026-12-02", surgeon: "Dr. Sneha Ortho" },
  ]);

  // Payment form state
  const [payForm, setPayForm] = useState({
    patientName: "",
    patientUhid: "",
    department: "OPD Consultation",
    amount: "500",
    paymentMode: "Cash",
    refNo: "",
    receiptType: "Consultation Fee",
  });

  const totalCollectedToday = receipts.reduce((sum, r) => sum + r.amount, 0);
  const cashTotal = receipts.filter((r) => r.paymentMode === "Cash").reduce((sum, r) => sum + r.amount, 0);
  const digitalTotal = receipts.filter((r) => r.paymentMode !== "Cash").reduce((sum, r) => sum + r.amount, 0);

  const handleIssueReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.patientName.trim()) {
      flashToast("Please enter patient name", "warn");
      return;
    }

    const rcptNumber = `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReceipt = {
      id: "rcpt_" + Date.now(),
      receiptNumber: rcptNumber,
      patientName: payForm.patientName.trim(),
      patientUhid: payForm.patientUhid.trim() || `CURA-2026-${Math.floor(100 + Math.random() * 900)}`,
      department: payForm.department,
      amount: Number(payForm.amount) || 0,
      paymentMode: payForm.paymentMode,
      refNo: payForm.refNo.trim() || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      cashier: currentUser?.username || "Cashier Desk 1",
      date: new Date().toISOString(),
      type: payForm.receiptType,
    };

    setReceipts([newReceipt, ...receipts]);
    log("CASHIER_RECEIPT_ISSUED", `Issued ${rcptNumber} for ₹${newReceipt.amount} via ${newReceipt.paymentMode}`);
    flashToast(`Receipt ${rcptNumber} generated successfully!`);
    setPayModalOpen(false);
  };

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.patientName.toLowerCase().includes(q) ||
      r.receiptNumber.toLowerCase().includes(q) ||
      r.patientUhid.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.paymentMode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/40">
              Hospital Cash Counter & Collections
            </span>
            <span className="text-xs text-emerald-200">Revenue Cycle · Pre-Booking · Settlement</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cashier Workstation & Daily Collections</h1>
          <p className="text-emerald-100/80 text-sm max-w-xl">
            Process direct billing receipts, manage advance surgery pre-bookings, compute daily cashier EOD reports, and export daybooks to Tally ERP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => setActiveTool("prebooking")}
          >
            <CalendarCheck className="w-4 h-4 mr-1 text-emerald-300" />
            Pre-Booking ({preBookings.length})
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
            onClick={() => setPayModalOpen(true)}
          >
            <Banknote className="w-4 h-4 mr-1" />
            Collect Payment
          </Button>
        </div>
      </div>

      {/* Tool Breadcrumb / Action Switcher */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs overflow-x-auto">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-slate-400 font-mono uppercase">ACTIVE TOOL:</span>
          <span className="bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md font-bold shadow-xs">
            {activeTool.replace("_", " ").toUpperCase()}
          </span>
          {dropdownOption && (
            <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
              Mode: {dropdownOption}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool("cashier_dashboard")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-medium"
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTool("daily_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-medium"
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveTool("collection_summary")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-medium"
          >
            Collection Summary
          </button>
          <button
            onClick={() => setActiveTool("prebooking")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-medium"
          >
            Pre-Booking
          </button>
          <button
            onClick={() => setActiveTool("tally_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-medium"
          >
            Tally Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Shift Collection</span>
            <Banknote className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{totalCollectedToday.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">{receipts.length} transactions</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Cash in Drawer</span>
            <Receipt className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            ₹{cashTotal.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">Physical currency tally</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Digital / Card / UPI</span>
            <CreditCard className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-2 font-mono">
            ₹{digitalTotal.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">Instant bank settlement</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Pre-Booking Deposits</span>
            <CalendarCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2 font-mono">
            ₹{preBookings.reduce((sum, b) => sum + b.advancePaid, 0).toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">Advance surgical funds</span>
        </div>
      </div>

      {/* ── TOOL VIEW: Dashboard / Daily Report / Receipts Table ── */}
      {(activeTool === "cashier_dashboard" ||
        activeTool === "daily_report" ||
        activeTool === "collection_summary" ||
        activeTool === "consolidated_payment" ||
        activeTool === "payments_entry") && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Hospital Receipts & Daily Collection Log
              </h2>
              <p className="text-xs text-slate-500">Chronological transaction vouchers with patient details and payment modes.</p>
            </div>
            <div className="w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search receipt #, patient, UHID..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Patient / UHID</th>
                    <th className="py-3 px-4">Department & Description</th>
                    <th className="py-3 px-4">Payment Mode & Ref</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.receiptNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{r.patientUhid}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{r.type}</div>
                        <div className="text-[11px] text-slate-400">{r.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{r.paymentMode}</span>
                        <div className="text-[10px] font-mono text-slate-400">{r.refNo}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                        ₹{r.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print Slip
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Pre-Booking Advances ── */}
      {activeTool === "prebooking" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-purple-600" />
                Surgical & Procedure Pre-Booking Ledger
              </h2>
              <p className="text-xs text-slate-500">Advance deposits collected for scheduled operations and admissions.</p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Scheduled Procedure</th>
                    <th className="py-3 px-4">Attending Surgeon</th>
                    <th className="py-3 px-4">Scheduled Date</th>
                    <th className="py-3 px-4 text-right">Advance Deposited</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {preBookings.map((pb) => (
                    <tr key={pb.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{pb.patientName}</td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">{pb.procedure}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{pb.surgeon}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(pb.surgeryDate)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                        ₹{pb.advancePaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge tone="green">Confirmed</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Tally Report & XML Export ── */}
      {activeTool === "tally_report" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              Tally Prime & ERP 9 Financial Daybook Integration
            </h2>
            <p className="text-xs text-slate-500">Export vouchers to Tally XML format for chartered accountant reconciliation.</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800 overflow-x-auto">
              <div className="text-emerald-400 font-bold">&lt;ENVELOPE&gt;</div>
              <div className="text-slate-400 pl-4">&lt;HEADER&gt;&lt;TALLYREQUEST&gt;Import Data&lt;/TALLYREQUEST&gt;&lt;/HEADER&gt;</div>
              <div className="text-slate-300 pl-4">&lt;BODY&gt;&lt;IMPORTDATA&gt;&lt;REQUESTDATA&gt;</div>
              <div className="text-slate-200 pl-8">&lt;TALLYMESSAGE xmlns:UDF="TallyUDF"&gt;</div>
              <div className="text-sky-300 pl-12">&lt;VOUCHER VCHTYPE="Receipt" ACTION="Create"&gt;</div>
              <div className="text-slate-300 pl-16">&lt;DATE&gt;20261124&lt;/DATE&gt;</div>
              <div className="text-slate-300 pl-16">&lt;VOUCHERNUMBER&gt;RCPT-2026-1082&lt;/VOUCHERNUMBER&gt;</div>
              <div className="text-slate-300 pl-16">&lt;PARTYLEDGERNAME&gt;Bank HDFC (Cura Inpatient)&lt;/PARTYLEDGERNAME&gt;</div>
              <div className="text-emerald-300 pl-16">&lt;AMOUNT&gt;-14500.00&lt;/AMOUNT&gt;</div>
              <div className="text-sky-300 pl-12">&lt;/VOUCHER&gt;</div>
              <div className="text-slate-200 pl-8">&lt;/TALLYMESSAGE&gt;</div>
              <div className="text-slate-300 pl-4">&lt;/REQUESTDATA&gt;&lt;/IMPORTDATA&gt;&lt;/BODY&gt;</div>
              <div className="text-emerald-400 font-bold">&lt;/ENVELOPE&gt;</div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                onClick={() => flashToast("Tally XML Daybook exported to Downloads!")}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download Tally XML Daybook
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── MODAL: Issue Payment Receipt ── */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Collect Hospital Payment & Issue Receipt"
        size="md"
      >
        <form onSubmit={handleIssueReceipt} className="space-y-4">
          <div>
            <Label>Patient Name *</Label>
            <Input
              required
              value={payForm.patientName}
              onChange={(e) => setPayForm({ ...payForm, patientName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Digital UHID</Label>
              <Input
                value={payForm.patientUhid}
                onChange={(e) => setPayForm({ ...payForm, patientUhid: e.target.value })}
                placeholder="e.g. CURA-2026-0042"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select
                value={payForm.department}
                onChange={(e) => setPayForm({ ...payForm, department: e.target.value })}
              >
                <option value="OPD Consultation">OPD Consultation</option>
                <option value="Inpatient IPD">Inpatient IPD</option>
                <option value="Diagnostic Lab">Diagnostic Lab</option>
                <option value="Emergency Triage">Emergency Triage</option>
                <option value="Pharmacy Sales">Pharmacy Sales</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount Collected (₹) *</Label>
              <Input
                type="number"
                required
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select
                value={payForm.paymentMode}
                onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI / QR">📱 UPI / QR</option>
                <option value="Credit Card">💳 Credit / Debit Card</option>
                <option value="Net Banking">🏦 Net Banking</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Payment Reference / Bank Transaction ID</Label>
            <Input
              value={payForm.refNo}
              onChange={(e) => setPayForm({ ...payForm, refNo: e.target.value })}
              placeholder="e.g. UPI-984210984 or POS-Slip-881"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Printer className="w-4 h-4 mr-1.5" />
              Collect & Print Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashierERP;
