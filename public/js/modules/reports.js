/**
 * Enterprise Reporting & Leadership Analytics Hub
 * Covers all 23+ named reports with summary KPIs, search, CSV export & A4 PDF print.
 */
import * as db from "../db.js";
import * as auth from "../auth.js";
import { esc, money, mountDataTable } from "../ui.js";

export async function renderEnterpriseReport(reportName, container) {
  auth.requirePermission("reports", "access enterprise reports");
  const financialRestricted = ["EOD Report", "TDS", "Audit Report", "Deleted Charges/Payment", "Cash Close Log Report"];
  if (financialRestricted.includes(reportName)) {
    auth.requirePermission("view_financial_reports", `view ${reportName}`);
  }

  const [patients, visits, ips, labs, bills, pharma, audits, closes, iuds, payouts, appts, beds] = await Promise.all([
    db.list("patients"),
    db.list("op_visits"),
    db.list("ip_admissions"),
    db.list("lab_orders"),
    db.list("cashier_bills"),
    db.list("pharmacy_sales"),
    db.list("audit_logs"),
    db.list("cash_closes"),
    db.list("obg_iud"),
    db.list("doctor_payouts"),
    db.list("appointments"),
    db.list("beds")
  ]);

  let columns = [];
  let rows = [];
  let summaryNote = "";

  switch (reportName) {
    case "Visit Details":
    case "Diagnosis Report":
    case "ICD Report":
    case "Illness Report":
    case "Patient By Illness":
      columns = [
        { key: "visitDate", label: "Date" },
        { key: "id", label: "Visit ID" },
        { key: "uhid", label: "UHID" },
        { key: "patientName", label: "Patient" },
        { key: "doctorName", label: "Doctor" },
        { key: "icdCode", label: "ICD Code" },
        { key: "diagnosis", label: "Diagnosis / Illness" },
        { key: "status", label: "Status" }
      ];
      rows = visits;
      break;
    case "IP Log Report":
    case "Surgery Report":
    case "CE Occupancy":
      columns = [
        { key: "id", label: "IP No" },
        { key: "admitDate", label: "Admit Date" },
        { key: "uhid", label: "UHID" },
        { key: "patientName", label: "Patient" },
        { key: "ward", label: "Ward" },
        { key: "roomNo", label: "Room" },
        { key: "diagnosis", label: "Diagnosis / Procedure" },
        { key: "status", label: "Status" }
      ];
      rows = ips;
      if (reportName === "CE Occupancy") {
        const occ = beds.filter((b) => b.status === "Occupied").length;
        summaryNote = `Live Bed Occupancy: ${occ} / ${beds.length} beds (${beds.length ? ((occ / beds.length) * 100).toFixed(1) : 0}%).`;
      }
      break;
    case "Patient Analysis":
    case "Patient Statistics":
    case "Patient Register Report":
      columns = [
        { key: "uhid", label: "UHID" },
        { key: "fullName", label: "Patient Name" },
        { key: "age", label: "Age" },
        { key: "gender", label: "Gender" },
        { key: "bloodGroup", label: "Blood Group" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "insuranceProvider", label: "Insurance" },
        { key: "createdAt", label: "Registered" }
      ];
      rows = patients;
      summaryNote = `Total Registered: ${patients.length} patients (${patients.filter((p) => p.gender === "Female").length} Female, ${patients.filter((p) => p.gender === "Male").length} Male).`;
      break;
    case "PreBooking Report":
    case "Review/Appt Report":
      columns = [
        { key: "date", label: "Date" },
        { key: "time", label: "Time" },
        { key: "uhid", label: "UHID" },
        { key: "patientName", label: "Patient" },
        { key: "doctorName", label: "Doctor" },
        { key: "phone", label: "Mobile" },
        { key: "status", label: "Status" }
      ];
      rows = appts;
      break;
    case "Diagnostics Chart":
    case "Lab EOD Report":
    case "External Lab Report":
      columns = [
        { key: "id", label: "Sample ID" },
        { key: "orderDate", label: "Date" },
        { key: "patientName", label: "Patient" },
        { key: "category", label: "Category" },
        { key: "testName", label: "Test" },
        { key: "source", label: "Lab Source" },
        { key: "price", label: "Price", render: (l) => money(l.price) },
        { key: "status", label: "Status" }
      ];
      rows = reportName === "External Lab Report" ? labs.filter((l) => l.source === "External") : labs;
      break;
    case "Deleted Charges/Payment":
      columns = [
        { key: "id", label: "Bill No" },
        { key: "billDate", label: "Date" },
        { key: "patientName", label: "Patient" },
        { key: "netAmount", label: "Voided Amt", render: (b) => money(b.netAmount || b.netTotal) },
        { key: "status", label: "Status" }
      ];
      rows = [
        ...bills.filter((b) => b.status === "Voided"),
        ...pharma.filter((p) => p.status === "Voided")
      ];
      break;
    case "Audit Report":
      columns = [
        { key: "timestamp", label: "Time", render: (a) => esc(String(a.timestamp || "").slice(0, 19).replace("T", " ")) },
        { key: "user", label: "User" },
        { key: "module", label: "Module" },
        { key: "action", label: "Action" },
        { key: "details", label: "Details" }
      ];
      rows = audits;
      break;
    case "TDS":
      columns = [
        { key: "payoutDate", label: "Date" },
        { key: "doctorName", label: "Doctor" },
        { key: "grossAmount", label: "Gross Fee", render: (r) => money(r.grossAmount) },
        { key: "tdsAmount", label: "TDS (10%)", render: (r) => money(r.tdsAmount) },
        { key: "netPaid", label: "Net Paid", render: (r) => money(r.netPaid) }
      ];
      rows = payouts;
      break;
    case "Cash Close Log Report":
      columns = [
        { key: "closeDate", label: "Date" },
        { key: "systemCash", label: "System Cash", render: (r) => money(r.systemCash) },
        { key: "physicalCash", label: "Physical", render: (r) => money(r.physicalCash) },
        { key: "variance", label: "Variance", render: (r) => money(r.variance) },
        { key: "closedBy", label: "Closed By" }
      ];
      rows = closes;
      break;
    case "IUD Report":
      columns = [
        { key: "recordDate", label: "Date" },
        { key: "patientName", label: "Patient" },
        { key: "field1", label: "Procedure Type" },
        { key: "field2", label: "Doctor / Notes" }
      ];
      rows = iuds;
      break;
    case "CE Summary":
      columns = [
        { key: "metric", label: "KPI Metric" },
        { key: "value", label: "Current Value" }
      ];
      rows = [
        { metric: "Total Registered Patients", value: patients.length },
        { metric: "OP Consultations Logged", value: visits.length },
        { metric: "Active IP Admissions", value: ips.filter((i) => i.status === "Admitted").length },
        { metric: "Diagnostic Orders Processed", value: labs.length },
        { metric: "Pharmacy Invoices Issued", value: pharma.length }
      ];
      break;
    case "EOD Report":
    case "Patient Payment History":
    default:
      columns = [
        { key: "id", label: "Bill No" },
        { key: "billDate", label: "Date" },
        { key: "uhid", label: "UHID" },
        { key: "patientName", label: "Patient" },
        { key: "category", label: "Department" },
        { key: "netAmount", label: "Amount", render: (b) => money(b.netAmount || b.netTotal) },
        { key: "paymentMode", label: "Mode" },
        { key: "status", label: "Status" }
      ];
      rows = [...bills, ...pharma.map((p) => ({ ...p, category: "Pharmacy", netAmount: p.netTotal }))];
      break;
  }

  container.innerHTML = `
    <div class="module-header">
      <div><h2>Enterprise Report: ${esc(reportName)}</h2><p>Search, export CSV, or print official A4 copy for hospital leadership.</p></div>
    </div>
    ${summaryNote ? `<div class="alert alert-info">${esc(summaryNote)}</div>` : ""}
    <div class="card"><div id="ent-rep-tbl"></div></div>
  `;

  mountDataTable(container.querySelector("#ent-rep-tbl"), {
    columns,
    rows,
    exportFileName: `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
    printTitle: `See Curavite Hospital Management — ${reportName}`
  });
}
