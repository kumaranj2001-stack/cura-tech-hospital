import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Input, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, fmtDateTime, flashToast, downloadCSV } from "../utils/helpers";
import { erpGet, useErpRealtime } from "../utils/erpApi";
import { BarChart2, Download, RefreshCw, Search } from "lucide-react";

interface ReportConfig {
  title: string;
  subtitle: string;
  category: "Clinical" | "Financial" | "Operational";
}

const REPORT_META: Record<string, ReportConfig> = {
  visit_details: { title: "OPD & Appointment Visit Details", subtitle: "Patient visit tokens, physician assignment & consultation outcomes", category: "Clinical" },
  ip_log_report: { title: "Inpatient IPD Admission Log", subtitle: "Ward/ICU census, daily bed charges & discharge status", category: "Clinical" },
  diagnostics_chart: { title: "Diagnostics Volume & Mix Chart", subtitle: "Departmental lab test volume and revenue distribution", category: "Clinical" },
  patient_analysis: { title: "Patient Demographic Analysis", subtitle: "Age, gender & blood-group breakdown across registered UHIDs", category: "Clinical" },
  illness_report: { title: "Chief Complaint & Illness Trends", subtitle: "Most frequent symptomatic presentations", category: "Clinical" },
  patient_by_illness: { title: "Patients Grouped by Diagnosis", subtitle: "Active clinical cohorts indexed by condition", category: "Clinical" },
  diagnosis_report: { title: "Physician Diagnosis Register", subtitle: "Signed consultation diagnoses and treatment summary", category: "Clinical" },
  patient_statistics: { title: "Hospital Patient Statistics", subtitle: "OPD vs IPD, active wards & diagnostic utilization metrics", category: "Clinical" },
  icd_report: { title: "ICD-10 & Clinical Coding Register", subtitle: "Structured morbidity & diagnostic classification entries", category: "Clinical" },
  eod_report_central: { title: "Central Hospital EOD Revenue Report", subtitle: "Merged Cashier counter receipts & Pharmacy POS invoices", category: "Financial" },
  lab_eod_central: { title: "Central Laboratory EOD Report", subtitle: "Diagnostic billing & verification counts across branches", category: "Financial" },
  tds_report: { title: "Section 194J TDS Deduction Report", subtitle: "Tax deducted at source on consultant payouts", category: "Financial" },
  patient_pay_history: { title: "Patient Payment History Ledger", subtitle: "All hospital receipts and pharmacy invoices per patient", category: "Financial" },
  deleted_charges: { title: "Cancelled Bills, Returns & Voided Charges", subtitle: "Audit register of cancelled invoices, lab orders & returns", category: "Financial" },
  cash_close_central: { title: "Central Cash Close Variance Report", subtitle: "Counter closing totals & physical cash variance history", category: "Financial" },
  patient_register_rep: { title: "Master Patient Registry (UHID)", subtitle: "Complete demographic register of hospital patients", category: "Operational" },
  surgery_report: { title: "OT Surgery & Procedure Log", subtitle: "Scheduled surgical cases and surgeon allocations", category: "Operational" },
  prebooking_rep: { title: "Surgical PreBooking Register", subtitle: "Advance surgical deposits and scheduled OT calendar", category: "Operational" },
  review_appt_report: { title: "Review & Follow-Up Appointment Report", subtitle: "Booked vs completed review visits", category: "Operational" },
  iud_report: { title: "Clinical Intervention & Special Ward Report", subtitle: "Inpatient special procedures and clinical intervention audit", category: "Operational" },
  ext_lab_central: { title: "External Reference Lab Dispatch Report", subtitle: "Outsourced samples tracked by partner laboratory", category: "Operational" },
  ce_reports: { title: "Clinical Excellence (CE) & Quality Indicators", subtitle: "Accreditation quality audits, infection control & peer reviews", category: "Operational" },
  audit_report: { title: "System & Clinical Audit Trail", subtitle: "Immutable timestamped action history across all ERP modules", category: "Operational" },
};

export const ReportsERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "visit_details",
  dropdownOption,
}) => {
  const { data } = useStore();
  const [activeReport, setActiveReport] = useState(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [reportBundle, setReportBundle] = useState<{
    cashCloseLogs: any[];
    preBookings: any[];
    receipts: any[];
    externalDispatches: any[];
    doctorIncomes: any[];
    expenses: any[];
  }>({ cashCloseLogs: [], preBookings: [], receipts: [], externalDispatches: [], doctorIncomes: [], expenses: [] });

  useEffect(() => {
    if (initialAction) setActiveReport(initialAction);
  }, [initialAction, dropdownOption]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpGet("/api/reports");
      setReportBundle({
        cashCloseLogs: res.cashCloseLogs || [],
        preBookings: res.preBookings || [],
        receipts: res.receipts || [],
        externalDispatches: res.externalDispatches || [],
        doctorIncomes: res.doctorIncomes || [],
        expenses: res.expenses || [],
      });
    } catch (err: any) {
      flashToast(err?.message || "Failed loading reports", "warn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useErpRealtime("accounts", loadReports);
  useErpRealtime("cashier", loadReports);
  useErpRealtime("lab", loadReports);

  // Unified dataset generator per report key so every single ribbon item has structured columns + CSV export
  const dataset = useMemo<{ columns: string[]; rows: Record<string, any>[] }>(() => {
    const patients = data.patients || [];
    const appointments = data.appointments || [];
    const admissions = data.admissions || [];
    const consultations = data.consultations || [];
    const labOrders = data.labOrders || [];
    const invoices = data.invoices || [];
    const audit = data.audit || [];
    const returns = data.returns || [];

    switch (activeReport) {
      case "ip_log_report":
      case "iud_report":
        return {
          columns: ["Admission #", "Patient", "Ward / Bed", "Doctor", "Department", "Diagnosis", "Status"],
          rows: admissions.map((a) => ({
            "Admission #": a.admissionNumber,
            Patient: a.patientName,
            "Ward / Bed": `${a.ward} (${a.bedNumber})`,
            Doctor: a.doctorName,
            Department: a.department,
            Diagnosis: a.provisionalDiagnosis || a.admissionReason,
            Status: a.status,
          })),
        };
      case "diagnostics_chart":
      case "lab_eod_central":
        return {
          columns: ["Order #", "Patient", "Test Name", "Category", "Status", "Fee"],
          rows: labOrders.map((o) => ({
            "Order #": o.orderNumber,
            Patient: o.patientName,
            "Test Name": o.testName,
            Category: o.category,
            Status: o.status,
            Fee: fmtCurrency(o.price),
          })),
        };
      case "patient_analysis":
      case "patient_register_rep":
      case "patient_statistics":
        return {
          columns: ["UHID", "Patient Name", "Age / Gender", "Phone", "Blood Group", "Created"],
          rows: patients.map((p) => ({
            UHID: p.uhid || p.id,
            "Patient Name": p.name,
            "Age / Gender": `${p.age || "-"} / ${p.gender || "-"}`,
            Phone: p.phone || "-",
            "Blood Group": p.bloodGroup || "-",
            Created: fmtDateTime(p.createdAt),
          })),
        };
      case "illness_report":
      case "patient_by_illness":
      case "diagnosis_report":
      case "icd_report":
        return {
          columns: ["Date", "Patient", "Doctor", "Chief Complaints", "Diagnosis", "Status"],
          rows: consultations.map((c) => ({
            Date: c.date,
            Patient: c.patientName,
            Doctor: c.doctorName,
            "Chief Complaints": c.chiefComplaints || "-",
            Diagnosis: c.diagnosis || "Under Evaluation",
            Status: c.status,
          })),
        };
      case "tds_report":
        return {
          columns: ["Doctor", "Department", "Month", "Gross Payable", "TDS (10%)", "Net Paid"],
          rows: reportBundle.doctorIncomes.map((d) => ({
            Doctor: d.doctorName,
            Department: d.department,
            Month: d.month,
            "Gross Payable": fmtCurrency(d.grossPayable),
            "TDS (10%)": fmtCurrency(d.tdsDeduction),
            "Net Paid": fmtCurrency(d.netPaid),
          })),
        };
      case "cash_close_central":
        return {
          columns: ["Date", "Cashier", "Shift", "Total Collected", "Handover", "Variance", "Status"],
          rows: reportBundle.cashCloseLogs.map((c) => ({
            Date: c.date,
            Cashier: c.cashierName,
            Shift: c.shift,
            "Total Collected": fmtCurrency(c.totalCollected),
            Handover: fmtCurrency(c.cashHandover),
            Variance: fmtCurrency(c.variance),
            Status: c.status,
          })),
        };
      case "surgery_report":
      case "prebooking_rep":
        return {
          columns: ["Booking #", "Patient", "Procedure", "Surgeon", "Surgery Date", "Advance Paid", "Status"],
          rows: reportBundle.preBookings.map((pb) => ({
            "Booking #": pb.bookingNo,
            Patient: pb.patientName,
            Procedure: pb.procedure,
            Surgeon: pb.surgeon,
            "Surgery Date": pb.surgeryDate,
            "Advance Paid": fmtCurrency(pb.advancePaid),
            Status: pb.status,
          })),
        };
      case "ext_lab_central":
        return {
          columns: ["Sample ID", "Patient", "Test", "Partner Lab", "Dispatched", "Status", "Cost"],
          rows: reportBundle.externalDispatches.map((d) => ({
            "Sample ID": d.sampleId,
            Patient: d.patientName,
            Test: d.testName,
            "Partner Lab": d.partnerLab,
            Dispatched: d.dispatchedAt,
            Status: d.status,
            Cost: fmtCurrency(d.cost),
          })),
        };
      case "deleted_charges":
        return {
          columns: ["Source", "Ref #", "Patient", "Details", "Amount", "Timestamp"],
          rows: [
            ...invoices.filter((i) => i.status === "cancelled").map((i) => ({ Source: "Void Invoice", "Ref #": i.number, Patient: i.patientName, Details: i.cancelReason || "Cancelled", Amount: fmtCurrency(i.total), Timestamp: fmtDateTime(i.date) })),
            ...labOrders.filter((o) => o.status === "cancelled").map((o) => ({ Source: "Cancelled Lab", "Ref #": o.orderNumber, Patient: o.patientName, Details: o.testName, Amount: fmtCurrency(o.price), Timestamp: fmtDateTime(o.createdAt) })),
            ...returns.map((r) => ({ Source: "Sales Return", "Ref #": r.invoiceNumber || r.id, Patient: r.patientName, Details: `${r.items?.length || 0} returned items`, Amount: fmtCurrency(r.refundTotal), Timestamp: fmtDateTime(r.date) })),
          ],
        };
      case "eod_report_central":
      case "patient_pay_history":
        return {
          columns: ["Ref #", "Patient", "Department / Source", "Payment Mode", "Date", "Amount"],
          rows: [
            ...reportBundle.receipts.map((r) => ({ "Ref #": r.receiptNumber, Patient: r.patientName, "Department / Source": r.department, "Payment Mode": r.paymentMode, Date: fmtDateTime(r.date), Amount: fmtCurrency(r.amount) })),
            ...invoices.map((inv) => ({ "Ref #": inv.number, Patient: inv.patientName, "Department / Source": "Pharmacy Sales", "Payment Mode": inv.paymentMethod, Date: fmtDateTime(inv.date), Amount: fmtCurrency(inv.total) })),
          ],
        };
      case "audit_report":
      case "ce_reports":
        return {
          columns: ["User", "Action", "Details", "Timestamp"],
          rows: audit.slice(0, 100).map((a) => ({
            User: a.user,
            Action: a.action,
            Details: a.details,
            Timestamp: fmtDateTime(a.timestamp),
          })),
        };
      case "visit_details":
      case "review_appt_report":
      default:
        return {
          columns: ["Token #", "Patient", "Doctor", "Date", "Slot", "Status"],
          rows: appointments.map((ap) => ({
            "Token #": ap.tokenNumber || "-",
            Patient: ap.patientName,
            Doctor: ap.doctorName,
            Date: ap.date,
            Slot: ap.timeSlot || "-",
            Status: ap.status,
          })),
        };
    }
  }, [activeReport, data, reportBundle]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataset.rows;
    return dataset.rows.filter((row) => Object.values(row).join(" ").toLowerCase().includes(q));
  }, [dataset.rows, searchQuery]);

  const meta = REPORT_META[activeReport] || REPORT_META.visit_details;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{meta.title}</h1>
            <Badge tone="blue">{meta.category}</Badge>
            {dropdownOption && <Badge tone="amber">{dropdownOption}</Badge>}
            {loading && <Badge tone="slate">Refreshing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadReports}><RefreshCw className="w-4 h-4" /> Sync All</Button>
          <Button variant="primary" size="sm" onClick={() => downloadCSV(`curatech_${activeReport}.csv`, filteredRows)}>
            <Download className="w-4 h-4" /> Export CSV ({filteredRows.length})
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Patients Registered</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{data.patients?.length || 0}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">OPD Visits</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{data.appointments?.length || 0}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-cyan-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Lab Orders</div>
          <div className="text-2xl font-bold text-cyan-600 mt-1">{data.labOrders?.length || 0}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Filtered Report Rows</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{filteredRows.length}</div>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader
          title={`${meta.title} (${filteredRows.length} records)`}
          right={
            <div className="relative w-56 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter rows..."
                className="pl-9"
              />
            </div>
          }
        />
        <CardBody className="p-0 overflow-x-auto">
          {filteredRows.length === 0 ? (
            <EmptyState icon="📊" title="No records match this report filter" sub="Records will appear automatically as transactions happen across departments." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {dataset.columns.map((col) => (
                    <Th key={col}>{col}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    {dataset.columns.map((col) => (
                      <Td key={col}>{row[col] ?? "—"}</Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
