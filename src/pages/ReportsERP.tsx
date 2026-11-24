import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import {
  BarChart2,
  Users,
  Bed,
  LineChart,
  Activity,
  UserCheck,
  Clipboard,
  BarChart,
  Globe,
  FileText,
  FlaskConical,
  Calculator,
  History,
  Trash2,
  Lock,
  BookOpen,
  Scissors,
  Calendar,
  CheckCircle2,
  HeartPulse,
  ExternalLink,
  Award,
  Shield,
  Search,
  Printer,
  Download,
  Filter,
} from "lucide-react";

export const ReportsERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "visit_details", dropdownOption }) => {
  const { data } = useStore();
  const [activeReport, setActiveReport] = useState<string>(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");

  const patients = data.patients || [];
  const appointments = data.appointments || [];
  const admissions = data.admissions || [];
  const labOrders = data.labOrders || [];
  const invoices = data.invoices || [];

  // Diagnoses statistics (mock clinical dataset for analytics)
  const topDiagnoses = [
    { code: "J20.9", name: "Acute Bronchitis", count: 48, dept: "General Medicine", percentage: "18%" },
    { code: "I10", name: "Essential Hypertension", count: 39, dept: "Cardiology", percentage: "15%" },
    { code: "E11.9", name: "Type 2 Diabetes Mellitus", count: 35, dept: "Endocrinology", percentage: "13%" },
    { code: "K21.9", name: "Gastro-Esophageal Reflux (GERD)", count: 28, dept: "Gastroenterology", percentage: "11%" },
    { code: "M54.5", name: "Low Back Pain (Lumbar Spondylosis)", count: 22, dept: "Orthopedics", percentage: "8%" },
    { code: "J06.9", name: "Acute Upper Respiratory Infection", count: 20, dept: "Pediatrics", percentage: "7%" },
  ];

  // Surgery Register Dataset
  const surgeries = [
    { id: "srg_1", date: "2026-11-20", patientName: "Ramesh Babu", uhid: "CURA-2026-081", surgery: "Laparoscopic Appendectomy", surgeon: "Dr. Kumaran", anesthesia: "General", outcome: "Successful" },
    { id: "srg_2", date: "2026-11-21", patientName: "Lakshmi Priya", uhid: "CURA-2026-102", surgery: "Cesarean Section (LSCS)", surgeon: "Dr. V. Lakshmi", anesthesia: "Spinal", outcome: "Successful" },
    { id: "srg_3", date: "2026-11-22", patientName: "Dinesh K", uhid: "CURA-2026-114", surgery: "Internal Fixation of Femur Fracture", surgeon: "Dr. Sneha Ortho", anesthesia: "Epidural", outcome: "Stable Recovery" },
  ];

  // IUD & Reproductive Health Dataset
  const iudRecords = [
    { id: "iud_1", date: "2026-11-18", patientName: "Meera Shankar", uhid: "CURA-2026-054", deviceType: "Copper-T 380A", doctor: "Dr. V. Lakshmi", followUp: "2026-12-18", remarks: "Procedure Uneventful" },
    { id: "iud_2", date: "2026-11-21", patientName: "Geetha Mohan", uhid: "CURA-2026-088", deviceType: "Mirena (Levonorgestrel)", doctor: "Dr. V. Lakshmi", followUp: "2026-12-21", remarks: "Good Tolerance" },
  ];

  // Hospital KPI computations
  const totalVisits = appointments.length;
  const totalAdmissions = admissions.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalTests = labOrders.length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-900 to-sky-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-400/40">
              Central Hospital Analytics
            </span>
            <span className="text-xs text-sky-200">23 Statutory & Executive Reports</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital-Wide Reports & Medical Records</h1>
          <p className="text-slate-200 text-sm max-w-xl">
            Central repository of clinical morbidity, bed censuses, operating theatre surgical registers, diagnostic trends, ICD-10 epidemiology, and financial reconciliation logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Report
          </Button>
          <Button
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md"
            onClick={() => flashToast("Report exported to CSV format!")}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Reports Quick Selector Ribbon Bar */}
      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-400 font-mono uppercase">ACTIVE REPORT:</span>
            <span className="bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 px-2.5 py-1 rounded-md font-bold shadow-xs">
              {activeReport.replace(/_/g, " ").toUpperCase()}
            </span>
            {dropdownOption && (
              <span className="bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800 font-mono">
                Category: {dropdownOption}
              </span>
            )}
          </div>

          <div className="w-56">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports data..."
              className="text-xs py-1 h-7"
            />
          </div>
        </div>

        {/* Horizontal Category Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {[
            { id: "visit_details", label: "Visit Details", icon: Users },
            { id: "ip_log_report", label: "IP Log Report", icon: Bed },
            { id: "diagnostics_chart", label: "Diagnostics Chart", icon: BarChart2 },
            { id: "patient_analysis", label: "Patient Analysis", icon: LineChart },
            { id: "eod_report_central", label: "EOD Report", icon: FileText },
            { id: "lab_eod_central", label: "Lab EOD", icon: FlaskConical },
            { id: "tds_report", label: "TDS Report", icon: Calculator },
            { id: "patient_register_rep", label: "Patient Register", icon: BookOpen },
            { id: "surgery_report", label: "Surgery Report", icon: Scissors },
            { id: "prebooking_rep", label: "PreBooking Report", icon: Calendar },
            { id: "iud_report", label: "IUD Report", icon: HeartPulse },
            { id: "illness_report", label: "Illness Report", icon: Activity },
            { id: "diagnosis_report", label: "Diagnosis (ICD-10)", icon: Globe },
            { id: "ce_reports", label: "CE Quality Audit", icon: Award },
            { id: "audit_report", label: "Audit Trail", icon: Shield },
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
                activeReport === rep.id
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600"
              }`}
            >
              <rep.icon className="w-3 h-3" />
              <span>{rep.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Outpatient Visits</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{totalVisits}</div>
          <span className="text-xs text-slate-500">Cumulative OPD Volume</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Inpatient Admissions</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{totalAdmissions}</div>
          <span className="text-xs text-slate-500">IPD Census Episodes</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Diagnostic Orders</div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2">{totalTests}</div>
          <span className="text-xs text-slate-500">Lab & Pathology Tests</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Gross Hospital Billing</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">Consolidated Receipts</span>
        </div>
      </div>

      {/* ── REPORT VIEW: Visit Details / Patient Register ── */}
      {(activeReport === "visit_details" || activeReport === "patient_register_rep" || activeReport === "review_appt_report") && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Patient Visit Details & Attendance Register
            </h2>
            <p className="text-xs text-slate-500">Chronological outpatient appointments and check-in timeline.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Token #</th>
                    <th className="py-3 px-4">Patient / UHID</th>
                    <th className="py-3 px-4">Physician & Dept</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">T-{apt.tokenNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{apt.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{apt.patientUhid || "NO-UHID"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{apt.doctorName}</div>
                        <div className="text-[11px] text-slate-400">{apt.department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{apt.timeSlot}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-[10px] text-slate-500">{apt.priority}</td>
                      <td className="py-3 px-4">
                        <Badge tone={apt.status === "completed" ? "green" : "blue"}>{apt.status.replace("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── REPORT VIEW: Inpatient (IP) Log Report ── */}
      {activeReport === "ip_log_report" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Bed className="w-4 h-4 text-indigo-600" />
              Inpatient (IP) Ward Admission & Census Log
            </h2>
            <p className="text-xs text-slate-500">Inpatient bed allocations, length of stay, and attending physicians.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Admission #</th>
                    <th className="py-3 px-4">Patient / UHID</th>
                    <th className="py-3 px-4">Ward & Bed</th>
                    <th className="py-3 px-4">Admitted Date</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Provisional Diagnosis</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {admissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{adm.admissionNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{adm.patientName}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{adm.ward}</span>
                        <div className="text-[11px] font-mono text-slate-400">Bed {adm.bedNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(adm.admittedAt)}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{adm.doctorName}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {adm.provisionalDiagnosis || adm.admissionReason}
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={adm.status === "admitted" ? "green" : "slate"}>{adm.status.toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── REPORT VIEW: Surgery Report ── */}
      {activeReport === "surgery_report" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-rose-500" />
              Operating Theatre (OT) Surgical Procedure Log
            </h2>
            <p className="text-xs text-slate-500">Major and minor surgical interventions, operating surgeons, and anesthesia types.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Patient Name & UHID</th>
                    <th className="py-3 px-4">Surgical Procedure</th>
                    <th className="py-3 px-4">Chief Surgeon</th>
                    <th className="py-3 px-4">Anesthesia</th>
                    <th className="py-3 px-4">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {surgeries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">{fmtDate(s.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{s.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{s.uhid}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{s.surgery}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{s.surgeon}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.anesthesia}</td>
                      <td className="py-3 px-4">
                        <Badge tone="green">{s.outcome}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── REPORT VIEW: IUD Report ── */}
      {activeReport === "iud_report" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-pink-500" />
              Intrauterine Contraceptive Device (IUD) Register
            </h2>
            <p className="text-xs text-slate-500">Reproductive health insertions, device batches, and scheduled review appointments.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Insertion Date</th>
                    <th className="py-3 px-4">Patient Name / UHID</th>
                    <th className="py-3 px-4">Device Model</th>
                    <th className="py-3 px-4">Gynecologist</th>
                    <th className="py-3 px-4">Follow-up Due</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {iudRecords.map((iud) => (
                    <tr key={iud.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">{fmtDate(iud.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{iud.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{iud.uhid}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-pink-700 dark:text-pink-300">{iud.deviceType}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{iud.doctor}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(iud.followUp)}</td>
                      <td className="py-3 px-4 text-slate-500">{iud.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── REPORT VIEW: Diagnosis (ICD-10) Epidemiology Report ── */}
      {(activeReport === "diagnosis_report" || activeReport === "illness_report" || activeReport === "patient_by_illness" || activeReport === "icd_report") && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-600" />
              ICD-10 Clinical Morbidity & Diagnosis Statistics
            </h2>
            <p className="text-xs text-slate-500">WHO International Classification of Diseases prevalence distribution.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">ICD-10 Code</th>
                    <th className="py-3 px-4">Clinical Diagnosis Description</th>
                    <th className="py-3 px-4">Primary Department</th>
                    <th className="py-3 px-4 text-center">Case Count</th>
                    <th className="py-3 px-4 text-right">Prevalence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {topDiagnoses.map((diag) => (
                    <tr key={diag.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">{diag.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{diag.name}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{diag.dept}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{diag.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {diag.percentage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── REPORT VIEW: Clinical Excellence (CE) Quality Audits ── */}
      {activeReport === "ce_reports" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Clinical Excellence (CE) & Quality Assurance Audits
            </h2>
            <p className="text-xs text-slate-500">NABH Quality Key Performance Indicators & Patient Safety Metrics.</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Surgical Site Infections (SSI)</span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">0.12%</div>
                <span className="text-[11px] text-slate-500">Benchmark: &lt; 1.0% (NABH Compliant)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Hand Hygiene Adherence</span>
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">94.8%</div>
                <span className="text-[11px] text-slate-500">WHO 5 Moments Compliance</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Bed Occupancy Rate (BOR)</span>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">82.4%</div>
                <span className="text-[11px] text-slate-500">Optimal clinical operating range</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default ReportsERP;
