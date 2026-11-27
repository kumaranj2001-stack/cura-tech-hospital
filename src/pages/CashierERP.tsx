import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, fmtDateTime, flashToast, downloadCSV, today } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime, downloadTextFile } from "../utils/erpApi";
import {
  Receipt,
  Banknote,
  CalendarCheck,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  FlaskConical,
  Clock,
} from "lucide-react";

interface CashierReceipt {
  id: string;
  branchId?: string;
  receiptNumber: string;
  patientName: string;
  patientUhid?: string;
  department: string;
  doctorName?: string;
  amount: number;
  discount?: number;
  paymentMode: string;
  refNo?: string;
  cashier?: string;
  date: string;
  type?: string;
  status: string;
}

interface PreBooking {
  id: string;
  branchId?: string;
  bookingNo: string;
  patientName: string;
  patientUhid?: string;
  procedure: string;
  advancePaid: number;
  surgeryDate: string;
  surgeon: string;
  status: string;
}

interface EmergencyLog {
  id: string;
  branchId?: string;
  caseNumber: string;
  patientName: string;
  triageLevel: string;
  arrivalMode: string;
  depositPaid: number;
  status: string;
  timestamp: string;
}

const CASHIER_TITLES: Record<string, string> = {
  cashier_dashboard: "Front Desk Cashier Dashboard",
  pending_dashboard: "Pending Bills & Unsettled Queue",
  cashier_diagnostics: "Diagnostics Billing Queue",
  prebooking: "Surgical & Procedure PreBookings",
  emergency_count: "Emergency & Trauma Billing Counter",
  eod_report: "Cashier EOD Collection Report",
  daily_report: "Daily Receipts Register",
  collection_summary: "Department & Payment Mode Summary",
  consolidated_payment: "Consolidated Hospital Collection Ledger",
  discount_report: "Concession & Discount Register",
  pending_payment_rep: "Pending Payment & Balance Dues",
  patient_reports: "Patient Financial Ledger & Slips",
  doctor_collection: "Doctor Revenue & Consultation Share",
  uncleared_payments: "Uncleared Cash & Cheque Reconciliation",
  payments_entry: "Collect Patient Receipt / Payment",
  tally_report: "Tally ERP Integration & Daybook Export",
};

export const CashierERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "cashier_dashboard",
  dropdownOption,
}) => {
  const { data, setData, currentBranch, viewBranchId, currentUser, log } = useStore();
  const currentBranchId = viewBranchId || currentBranch?.id || "br_main";
  const [activeTool, setActiveTool] = useState(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [receipts, setReceipts] = useState<CashierReceipt[]>([]);
  const [preBookings, setPreBookings] = useState<PreBooking[]>([]);
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyLog[]>([]);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [pbModalOpen, setPbModalOpen] = useState(false);
  const [emgModalOpen, setEmgModalOpen] = useState(false);

  const [payForm, setPayForm] = useState({
    patientName: "",
    patientUhid: "",
    department: "OPD Consultation",
    doctorName: "Dr. Arvind Sharma",
    amount: "",
    discount: "0",
    paymentMode: "Cash",
    refNo: "",
    type: "OPD Receipt",
  });
  const [pbForm, setPbForm] = useState({ patientName: "", patientUhid: "", procedure: "", advancePaid: "10000", surgeryDate: today(), surgeon: "Dr. Arvind Sharma" });
  const [emgForm, setEmgForm] = useState({ patientName: "", triageLevel: "Priority 1 - Red", arrivalMode: "Ambulance", depositPaid: "3500" });

  useEffect(() => {
    if (initialAction) setActiveTool(initialAction);
  }, [initialAction, dropdownOption]);

  const loadCashier = useCallback(async () => {
    setLoading(true);
    try {
      const q = currentBranchId && currentBranchId !== "all" ? `?branchId=${encodeURIComponent(currentBranchId)}` : "";
      const res = await erpGet(`/api/cashier${q}`);
      setReceipts(res.receipts || []);
      setPreBookings(res.preBookings || []);
      setEmergencyLogs(res.emergencyLogs || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed to load cashier data", "warn");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadCashier();
  }, [loadCashier]);

  useErpRealtime("cashier", loadCashier);

  // Combine backend cashier receipts with pharmacy invoices for consolidated views
  const combinedEntries = useMemo(() => {
    const pharmacyMapped: CashierReceipt[] = (data.invoices || []).map((inv) => ({
      id: `inv_${inv.id}`,
      branchId: inv.branchId,
      receiptNumber: inv.number,
      patientName: inv.patientName,
      patientUhid: inv.patientId,
      department: "Pharmacy Sales",
      doctorName: inv.doctorName || "—",
      amount: inv.total || 0,
      discount: inv.discountAmount || 0,
      paymentMode: (inv.paymentMethod || "cash").toUpperCase(),
      refNo: inv.paymentRef || "PHARM-POS",
      cashier: inv.createdBy,
      date: inv.date,
      type: "Pharmacy Invoice",
      status: inv.status === "cancelled" ? "uncleared" : "cleared",
    }));
    return [...receipts, ...pharmacyMapped];
  }, [receipts, data.invoices]);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeTool === "consolidated_payment" ? combinedEntries : receipts;
    return list.filter((r) => {
      if (activeTool === "uncleared_payments" && r.status !== "uncleared") return false;
      if (activeTool === "discount_report" && (r.discount || 0) <= 0) return false;
      if (modeFilter !== "all" && !r.paymentMode.toLowerCase().includes(modeFilter.toLowerCase())) return false;
      if (!q) return true;
      return `${r.receiptNumber} ${r.patientName} ${r.patientUhid || ""} ${r.department}`.toLowerCase().includes(q);
    });
  }, [receipts, combinedEntries, activeTool, modeFilter, searchQuery]);

  const totalCollected = useMemo(() => receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0), [receipts]);
  const unclearedCount = useMemo(() => receipts.filter((r) => r.status === "uncleared").length, [receipts]);
  const unbilledLabOrders = useMemo(() => (data.labOrders || []).filter((o) => !o.billed && o.status !== "cancelled"), [data.labOrders]);
  const pendingAdmissions = useMemo(() => (data.admissions || []).filter((a) => a.status === "admitted"), [data.admissions]);

  const modeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const r of combinedEntries) {
      const key = r.paymentMode || "Cash";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(r.amount) || 0;
    }
    return Object.entries(map);
  }, [combinedEntries]);

  const doctorShares = useMemo(() => {
    const map: Record<string, { cases: number; gross: number }> = {};
    for (const r of combinedEntries) {
      const docName = r.doctorName || "Unassigned";
      if (!map[docName]) map[docName] = { cases: 0, gross: 0 };
      map[docName].cases += 1;
      map[docName].gross += Number(r.amount) || 0;
    }
    return Object.entries(map).map(([doctor, stats]) => ({
      doctor,
      cases: stats.cases,
      gross: stats.gross,
      doctorShare: Math.round(stats.gross * 0.7),
      hospitalShare: Math.round(stats.gross * 0.3),
    }));
  }, [combinedEntries]);

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payForm.amount) || 0;
    if (!payForm.patientName.trim() || amount <= 0) {
      return flashToast("Patient name and valid positive amount required", "warn");
    }
    try {
      await erpMutate("/api/cashier", {
        action: "receipt",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        patientName: payForm.patientName.trim(),
        patientUhid: payForm.patientUhid.trim() || undefined,
        department: payForm.department,
        doctorName: payForm.doctorName,
        amount,
        discount: Number(payForm.discount) || 0,
        paymentMode: payForm.paymentMode,
        refNo: payForm.refNo.trim() || `TXN-${Date.now().toString().slice(-6)}`,
        cashier: currentUser?.name || "Cashier Desk",
        type: payForm.type,
        status: payForm.paymentMode === "Cheque" ? "uncleared" : "cleared",
      });
      log("CASHIER_RECEIPT", `Collected ${fmtCurrency(amount)} from ${payForm.patientName}`);
      setPayModalOpen(false);
      setPayForm({ ...payForm, patientName: "", patientUhid: "", amount: "", discount: "0", refNo: "" });
      await loadCashier();
      flashToast("Receipt posted & synced", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Payment post failed", "warn");
    }
  };

  const handleBillLabOrder = async (orderId: string, patientName: string, patientUhid: string | undefined, testName: string, price: number) => {
    try {
      const res = await erpMutate("/api/cashier", {
        action: "receipt",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        patientName,
        patientUhid,
        department: "Diagnostic Lab",
        amount: price,
        discount: 0,
        paymentMode: "Cash",
        type: `Lab Test: ${testName}`,
        status: "cleared",
      });
      setData((prev) => ({
        ...prev,
        labOrders: (prev.labOrders || []).map((o) =>
          o.id === orderId ? { ...o, billed: true, invoiceId: res.item?.receiptNumber || res.item?.id } : o
        ),
      }));
      await loadCashier();
      flashToast(`Billed ${testName} for ${patientName}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Lab billing failed", "warn");
    }
  };

  const handleClearPayment = async (id: string) => {
    try {
      await erpMutate("/api/cashier", { action: "clear-payment", id }, "PUT");
      await loadCashier();
      flashToast("Payment cleared and reconciled", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Clearance failed", "warn");
    }
  };

  const handleCreatePreBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pbForm.patientName.trim() || !pbForm.procedure.trim()) return flashToast("Patient and procedure required", "warn");
    try {
      await erpMutate("/api/cashier", {
        action: "prebooking",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        ...pbForm,
        advancePaid: Number(pbForm.advancePaid) || 0,
      });
      setPbModalOpen(false);
      setPbForm({ patientName: "", patientUhid: "", procedure: "", advancePaid: "10000", surgeryDate: today(), surgeon: "Dr. Arvind Sharma" });
      await loadCashier();
      flashToast("Surgery PreBooking confirmed", "ok");
    } catch (err: any) {
      flashToast(err?.message || "PreBooking failed", "warn");
    }
  };

  const handleCreateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emgForm.patientName.trim()) return flashToast("Patient name required", "warn");
    try {
      await erpMutate("/api/cashier", {
        action: "emergency",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        ...emgForm,
        depositPaid: Number(emgForm.depositPaid) || 0,
        status: "Under Observation",
      });
      setEmgModalOpen(false);
      setEmgForm({ patientName: "", triageLevel: "Priority 1 - Red", arrivalMode: "Ambulance", depositPaid: "3500" });
      await loadCashier();
      flashToast("Emergency case & advance deposit registered", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Emergency log failed", "warn");
    }
  };

  const handleExportTallyXml = () => {
    const vouchers = combinedEntries
      .slice(0, 50)
      .map(
        (r) =>
          `  <VOUCHER VCHTYPE="Receipt" ACTION="Create">\n    <DATE>${(r.date || today()).slice(0, 10).replace(/-/g, "")}</DATE>\n    <NARRATION>${r.receiptNumber} - ${r.patientName} (${r.department})</NARRATION>\n    <VOUCHERNUMBER>${r.receiptNumber}</VOUCHERNUMBER>\n    <AMOUNT>${r.amount}</AMOUNT>\n  </VOUCHER>`
      )
      .join("\n");
    const xml = `<ENVELOPE>\n  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDATA>\n${vouchers}\n      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    downloadTextFile(`curatech_tally_daybook_${today()}.xml`, xml);
    flashToast("Generated Tally XML Daybook export", "ok");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{CASHIER_TITLES[activeTool] || "Cashier & Revenue Counter"}</h1>
            {dropdownOption && <Badge tone="blue">{dropdownOption}</Badge>}
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Live front-desk collections, diagnostics settlement & Tally ERP reconciliation</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadCashier}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="primary" size="sm" onClick={() => setPayModalOpen(true)}><Plus className="w-4 h-4" /> Collect Payment</Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Cashier Total</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{fmtCurrency(totalCollected)}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Unbilled Lab Orders</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{unbilledLabOrders.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Uncleared Txns</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{unclearedCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Active PreBookings</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{preBookings.length}</div>
        </Card>
      </div>

      {/* Specific Sub-views */}
      {activeTool === "payments_entry" ? (
        <Card>
          <CardHeader title="Direct Counter Receipt Collection" subtitle="Post immediate cash, UPI, or card settlement against any UHID" />
          <CardBody>
            <form onSubmit={handleRecordReceipt} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Patient Name *</Label><Input value={payForm.patientName} onChange={(e) => setPayForm({ ...payForm, patientName: e.target.value })} required /></div>
              <div><Label>UHID / Patient Code</Label><Input value={payForm.patientUhid} onChange={(e) => setPayForm({ ...payForm, patientUhid: e.target.value })} placeholder="CURA-2026-..." /></div>
              <div>
                <Label>Department</Label>
                <Select value={payForm.department} onChange={(e) => setPayForm({ ...payForm, department: e.target.value })}>
                  <option value="OPD Consultation">OPD Consultation</option>
                  <option value="Diagnostic Lab">Diagnostic Lab</option>
                  <option value="Inpatient IPD">Inpatient IPD</option>
                  <option value="Emergency Triage">Emergency Triage</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                </Select>
              </div>
              <div><Label>Doctor</Label><Input value={payForm.doctorName} onChange={(e) => setPayForm({ ...payForm, doctorName: e.target.value })} /></div>
              <div><Label>Amount (INR) *</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
              <div><Label>Discount (INR)</Label><Input type="number" value={payForm.discount} onChange={(e) => setPayForm({ ...payForm, discount: e.target.value })} /></div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={payForm.paymentMode} onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}>
                  <option value="Cash">Cash</option>
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Cheque (Uncleared)</option>
                </Select>
              </div>
              <div><Label>Reference / Auth No</Label><Input value={payForm.refNo} onChange={(e) => setPayForm({ ...payForm, refNo: e.target.value })} /></div>
              <div className="flex items-end"><Button type="submit" variant="success" className="w-full"><Banknote className="w-4 h-4" /> Post Official Receipt</Button></div>
            </form>
          </CardBody>
        </Card>
      ) : activeTool === "cashier_diagnostics" || activeTool === "pending_dashboard" || activeTool === "pending_payment_rep" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Unbilled Lab Orders Ready for Settlement" subtitle="1-click counter billing marks diagnostics order billed in real time" />
            <CardBody className="p-0 overflow-x-auto">
              {unbilledLabOrders.length === 0 ? (
                <EmptyState icon="🧪" title="No unbilled diagnostic orders" sub="All active lab orders have been settled." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr><Th>Order #</Th><Th>Patient</Th><Th>Investigation</Th><Th>Doctor</Th><Th className="text-right">Fee</Th><Th className="text-right">Action</Th></tr>
                  </thead>
                  <tbody>
                    {unbilledLabOrders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                        <Td className="font-mono text-xs">{o.orderNumber}</Td>
                        <Td className="font-semibold">{o.patientName}</Td>
                        <Td><FlaskConical className="w-3.5 h-3.5 inline mr-1 text-cyan-600" />{o.testName}</Td>
                        <Td>{o.doctorName || "—"}</Td>
                        <Td className="text-right font-bold">{fmtCurrency(o.price)}</Td>
                        <Td className="text-right">
                          <Button size="sm" variant="success" onClick={() => handleBillLabOrder(o.id, o.patientName, o.patientUhid, o.testName, o.price)}>Collect Fee</Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Active IPD Admissions — Interim Deposits" />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr><Th>Admission #</Th><Th>Patient</Th><Th>Ward / Bed</Th><Th className="text-right">Daily Bed Rate</Th><Th className="text-right">Initial Deposit</Th></tr>
                </thead>
                <tbody>
                  {pendingAdmissions.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{a.admissionNumber}</Td>
                      <Td className="font-semibold">{a.patientName}</Td>
                      <Td>{a.ward} ({a.bedNumber})</Td>
                      <Td className="text-right">{fmtCurrency(a.dailyBedCharge)}</Td>
                      <Td className="text-right font-bold text-emerald-600">{fmtCurrency(a.initialDeposit || 0)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      ) : activeTool === "prebooking" ? (
        <Card>
          <CardHeader
            title="Surgical & Package PreBookings"
            right={<Button size="sm" onClick={() => setPbModalOpen(true)}><CalendarCheck className="w-3.5 h-3.5" /> New PreBooking</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><Th>Booking #</Th><Th>Patient</Th><Th>Procedure</Th><Th>Surgeon</Th><Th>Scheduled Date</Th><Th className="text-right">Advance Paid</Th><Th>Status</Th></tr>
              </thead>
              <tbody>
                {preBookings.map((pb) => (
                  <tr key={pb.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{pb.bookingNo}</Td>
                    <Td className="font-semibold">{pb.patientName}</Td>
                    <Td>{pb.procedure}</Td>
                    <Td>{pb.surgeon}</Td>
                    <Td>{pb.surgeryDate}</Td>
                    <Td className="text-right font-bold text-emerald-600">{fmtCurrency(pb.advancePaid)}</Td>
                    <Td><Badge tone="green">{pb.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "emergency_count" ? (
        <Card>
          <CardHeader
            title="Emergency & Trauma Case Counter"
            right={<Button size="sm" variant="danger" onClick={() => setEmgModalOpen(true)}><AlertTriangle className="w-3.5 h-3.5" /> Log ER Deposit</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><Th>Case #</Th><Th>Patient</Th><Th>Triage Priority</Th><Th>Arrival</Th><Th className="text-right">Deposit Paid</Th><Th>Status</Th></tr>
              </thead>
              <tbody>
                {emergencyLogs.map((em) => (
                  <tr key={em.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{em.caseNumber}</Td>
                    <Td className="font-semibold">{em.patientName}</Td>
                    <Td><Badge tone="red">{em.triageLevel}</Badge></Td>
                    <Td>{em.arrivalMode}</Td>
                    <Td className="text-right font-bold">{fmtCurrency(em.depositPaid)}</Td>
                    <Td><Badge tone="amber">{em.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "collection_summary" ? (
        <Card>
          <CardHeader
            title="Payment Mode Collection Summary"
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("collection_summary.csv", modeBreakdown.map(([mode, s]) => ({ mode, ...s })))}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modeBreakdown.map(([mode, stat]) => (
              <div key={mode} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
                <div className="text-xs font-bold uppercase text-slate-500">{mode}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{fmtCurrency(stat.total)}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.count} receipts</div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : activeTool === "doctor_collection" ? (
        <Card>
          <CardHeader
            title={`Doctor Collection Share${dropdownOption ? ` — ${dropdownOption}` : ""}`}
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("doctor_collection.csv", doctorShares)}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><Th>Consultant</Th><Th>Cases Billed</Th><Th className="text-right">Gross Revenue</Th><Th className="text-right">Doctor Share (70%)</Th><Th className="text-right">Hospital Retention</Th></tr>
              </thead>
              <tbody>
                {doctorShares.map((d) => (
                  <tr key={d.doctor} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold">{d.doctor}</Td>
                    <Td>{d.cases}</Td>
                    <Td className="text-right">{fmtCurrency(d.gross)}</Td>
                    <Td className="text-right font-bold text-emerald-600">{fmtCurrency(d.doctorShare)}</Td>
                    <Td className="text-right font-medium">{fmtCurrency(d.hospitalShare)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "tally_report" ? (
        <Card>
          <CardHeader
            title={`Tally Prime Accounting Bridge${dropdownOption ? ` — ${dropdownOption}` : ""}`}
            subtitle="Generate Tally-compatible XML vouchers & Daybook CSV ledgers"
          />
          <CardBody className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>Ready to export <strong>{combinedEntries.length}</strong> consolidated receipts/invoices into Tally ERP voucher XML schema.</p>
              <p className="text-xs text-slate-400">Ledger Mapping: OPD/IPD Collections, Diagnostic Revenue, Pharmacy Sales & Tax Accounts.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => downloadCSV("tally_daybook.csv", combinedEntries as any[])}>
                <FileSpreadsheet className="w-4 h-4" /> CSV Daybook
              </Button>
              <Button variant="primary" onClick={handleExportTallyXml}>
                <Download className="w-4 h-4" /> Export Tally XML
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        /* Receipts Ledger: Dashboard, EOD, Daily, Consolidated, Discount, Patient Reports, Uncleared */
        <Card>
          <CardHeader
            title={`${CASHIER_TITLES[activeTool] || "Receipts Register"}${dropdownOption ? ` (${dropdownOption})` : ""}`}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Search receipt, patient, UHID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48" />
                <Select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-32">
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </Select>
                <Button size="sm" variant="secondary" onClick={() => downloadCSV(`cashier_${activeTool}.csv`, filteredReceipts as any[])}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            {filteredReceipts.length === 0 ? (
              <EmptyState icon="💳" title="No matching receipts" sub="Collect a new receipt or adjust search criteria." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Receipt #</Th>
                    <Th>Patient / UHID</Th>
                    <Th>Department & Type</Th>
                    <Th>Mode</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Discount</Th>
                    <Th className="text-right">Amount</Th>
                    {activeTool === "uncleared_payments" && <Th className="text-right">Action</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <Td className="font-mono text-xs">{r.receiptNumber}</Td>
                      <Td>
                        <div className="font-semibold">{r.patientName}</div>
                        <div className="text-xs text-slate-400">{r.patientUhid || "Walk-in"}</div>
                      </Td>
                      <Td>
                        <div>{r.department}</div>
                        <div className="text-xs text-slate-400">{r.type || "Settlement"}</div>
                      </Td>
                      <Td><Badge tone="blue">{r.paymentMode}</Badge></Td>
                      <Td className="text-xs">{fmtDateTime(r.date)}</Td>
                      <Td><Badge tone={r.status === "cleared" ? "green" : "amber"}>{r.status}</Badge></Td>
                      <Td className="text-right text-slate-500">{fmtCurrency(r.discount || 0)}</Td>
                      <Td className="text-right font-bold">{fmtCurrency(r.amount)}</Td>
                      {activeTool === "uncleared_payments" && (
                        <Td className="text-right">
                          <Button size="sm" variant="success" onClick={() => handleClearPayment(r.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                          </Button>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* Collect Payment Modal */}
      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} title="Collect Patient Receipt">
        <form onSubmit={handleRecordReceipt} className="space-y-3">
          <div><Label>Patient Name</Label><Input value={payForm.patientName} onChange={(e) => setPayForm({ ...payForm, patientName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Department</Label><Input value={payForm.department} onChange={(e) => setPayForm({ ...payForm, department: e.target.value })} /></div>
            <div><Label>Amount (INR)</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={payForm.paymentMode} onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}>
                <option value="Cash">Cash</option><option value="UPI / QR">UPI / QR</option><option value="Credit Card">Credit Card</option><option value="Cheque">Cheque</option>
              </Select>
            </div>
            <div><Label>Ref No</Label><Input value={payForm.refNo} onChange={(e) => setPayForm({ ...payForm, refNo: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="success">Save Receipt</Button>
          </div>
        </form>
      </Modal>

      {/* PreBooking Modal */}
      <Modal open={pbModalOpen} onClose={() => setPbModalOpen(false)} title="New Surgical / Procedure PreBooking">
        <form onSubmit={handleCreatePreBooking} className="space-y-3">
          <div><Label>Patient Name</Label><Input value={pbForm.patientName} onChange={(e) => setPbForm({ ...pbForm, patientName: e.target.value })} required /></div>
          <div><Label>Procedure / Surgery</Label><Input value={pbForm.procedure} onChange={(e) => setPbForm({ ...pbForm, procedure: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Surgery Date</Label><Input type="date" value={pbForm.surgeryDate} onChange={(e) => setPbForm({ ...pbForm, surgeryDate: e.target.value })} /></div>
            <div><Label>Advance Paid (INR)</Label><Input type="number" value={pbForm.advancePaid} onChange={(e) => setPbForm({ ...pbForm, advancePaid: e.target.value })} /></div>
          </div>
          <div><Label>Surgeon</Label><Input value={pbForm.surgeon} onChange={(e) => setPbForm({ ...pbForm, surgeon: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setPbModalOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm PreBooking</Button>
          </div>
        </form>
      </Modal>

      {/* Emergency Case Modal */}
      <Modal open={emgModalOpen} onClose={() => setEmgModalOpen(false)} title="Register Emergency Triage Deposit">
        <form onSubmit={handleCreateEmergency} className="space-y-3">
          <div><Label>Patient Name</Label><Input value={emgForm.patientName} onChange={(e) => setEmgForm({ ...emgForm, patientName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Triage Priority</Label>
              <Select value={emgForm.triageLevel} onChange={(e) => setEmgForm({ ...emgForm, triageLevel: e.target.value })}>
                <option value="Priority 1 - Red">Priority 1 - Red</option>
                <option value="Priority 2 - Yellow">Priority 2 - Yellow</option>
                <option value="Priority 3 - Green">Priority 3 - Green</option>
              </Select>
            </div>
            <div><Label>Deposit Paid (INR)</Label><Input type="number" value={emgForm.depositPaid} onChange={(e) => setEmgForm({ ...emgForm, depositPaid: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEmgModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger"><Clock className="w-3.5 h-3.5" /> Log ER Deposit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
