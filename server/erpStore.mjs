/**
 * Persistent Enterprise Datastore for Cura-Tech Hospital ERP
 *
 * Provides durable JSON disk storage (`server/.data/erp-store.json`) with:
 * - Atomic temp-file-and-rename writes & mtime cross-process sync
 * - Recursive prototype-pollution & input sanitization
 * - Best-effort Firestore synchronization (`gp_*` collections) without blocking on un-deployed rules
 * - Seeded operational registries for all 17 hospital ERP modules
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, COLLECTIONS } from "./firebase.mjs";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "erp-store.json");

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizeString(val, maxLen = 2000) {
  return String(val ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeValue(input, depth = 0) {
  if (depth > 8) return undefined;
  if (input === null || input === undefined) return undefined;
  if (typeof input === "string") return sanitizeString(input);
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input === "boolean") return input;
  if (Array.isArray(input)) {
    return input.slice(0, 500).map((item) => sanitizeValue(item, depth + 1)).filter((v) => v !== undefined);
  }
  if (typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      const cleanKey = sanitizeString(k, 80);
      if (!cleanKey) continue;
      const cleanVal = sanitizeValue(v, depth + 1);
      if (cleanVal !== undefined) out[cleanKey] = cleanVal;
    }
    return out;
  }
  return undefined;
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createInitialState() {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  return {
    admissions: [
      {
        id: "adm_1001",
        admissionNumber: "IPD-1001",
        branchId: "br_main",
        patientId: "pat_inpatient_1",
        patientUhid: "CURA-2026-0001",
        patientName: "Robert Vance",
        patientPhone: "9876501234",
        patientAge: 54,
        patientGender: "Male",
        doctorId: "doc_1",
        doctorName: "Dr. Arvind Sharma",
        department: "General Medicine",
        ward: "General Ward",
        bedNumber: "GW-03",
        admittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        admissionReason: "Severe community-acquired pneumonia requiring IV antibiotics and oxygen therapy",
        provisionalDiagnosis: "Bilateral Lobar Pneumonia",
        dailyBedCharge: 1200,
        initialDeposit: 5000,
        status: "admitted",
        createdAt: now,
      },
      {
        id: "adm_1002",
        admissionNumber: "IPD-1002",
        branchId: "br_main",
        patientId: "pat_inpatient_2",
        patientUhid: "CURA-2026-0002",
        patientName: "Meera Krishnan",
        patientPhone: "9811223344",
        patientAge: 42,
        patientGender: "Female",
        doctorId: "doc_2",
        doctorName: "Dr. Priya Nair",
        department: "Cardiology",
        ward: "ICU",
        bedNumber: "ICU-02",
        admittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        admissionReason: "Unstable Angina with acute ST changes for continuous cardiac monitoring",
        provisionalDiagnosis: "Acute Coronary Syndrome (NSTEMI)",
        dailyBedCharge: 8000,
        initialDeposit: 15000,
        status: "admitted",
        createdAt: now,
      },
    ],
    lab: {
      reagents: [
        { id: "reg_1", branchId: "br_main", name: "CBC Diluent (20L)", batch: "DIL-9812", stock: 14, minStock: 5, unitCost: 1800, vendor: "Sysmex India", expiry: "2027-08-31" },
        { id: "reg_2", branchId: "br_main", name: "Biochemistry Lyse Reagent", batch: "LYS-4421", stock: 3, minStock: 6, unitCost: 3200, vendor: "Roche Diagnostics", expiry: "2027-04-15" },
        { id: "reg_3", branchId: "br_main", name: "Blood Glucose Hexokinase Cartridges", batch: "GLU-1092", stock: 28, minStock: 10, unitCost: 950, vendor: "Beckman Coulter", expiry: "2027-11-30" },
        { id: "reg_4", branchId: "br_main", name: "Urine 10-Parameter Test Strips", batch: "URS-8824", stock: 50, minStock: 20, unitCost: 450, vendor: "Siemens Healthineers", expiry: "2028-01-15" },
      ],
      externalLabs: [
        { id: "ext_1", name: "Metropolis Healthcare Ltd", accNo: "MET-CHN-402", contact: "+91 44 4299 8000", pendingDispatches: 3, tatHrs: "24-48 hrs" },
        { id: "ext_2", name: "Dr. Lal PathLabs", accNo: "LAL-7812", contact: "+91 44 2822 5500", pendingDispatches: 1, tatHrs: "12-24 hrs" },
        { id: "ext_3", name: "SRL Diagnostics Reference Center", accNo: "SRL-9901", contact: "+91 44 4500 1000", pendingDispatches: 0, tatHrs: "36-72 hrs" },
      ],
      externalDispatches: [
        { id: "ed_1", branchId: "br_main", patientName: "Karthik Raja", patientUhid: "CURA-2026-0091", testName: "HLA-B27 PCR Genotyping", partnerLab: "Metropolis Healthcare Ltd", sampleId: "EXT-BAR-901", dispatchedAt: today, status: "dispatched", cost: 2800 },
      ],
      purchaseOrders: [
        { id: "lpo_1", branchId: "br_main", poNumber: "LAB-PO-2026-101", vendor: "Roche Diagnostics", itemName: "Biochemistry Lyse Reagent", qty: 10, unitCost: 3200, total: 32000, date: today, status: "Pending", paymentStatus: "Pending" },
        { id: "lpo_2", branchId: "br_main", poNumber: "LAB-PO-2026-102", vendor: "Sysmex India", itemName: "CBC Diluent (20L)", qty: 6, unitCost: 1800, total: 10800, date: today, status: "Approved", paymentStatus: "Paid" },
      ],
      analyzers: [
        { id: "anz_1", name: "Sysmex XN-550 Hematology Analyzer", serial: "SYS-XN-5519", department: "Hematology", lastCalibration: "2026-11-01", nextCalibration: "2027-02-01", amcStatus: "Active", status: "Operational" },
        { id: "anz_2", name: "Cobas c311 Clinical Chemistry Analyzer", serial: "COB-311-882", department: "Biochemistry", lastCalibration: "2026-10-20", nextCalibration: "2027-01-20", amcStatus: "Active", status: "Operational" },
      ],
      testCatalog: [
        { id: "tc_1", type: "bloodtest", code: "BLD-CBC", name: "Complete Blood Count (CBC)", department: "Hematology", sampleType: "EDTA Whole Blood", price: 450, tatHours: 2, active: true },
        { id: "tc_2", type: "bloodtest", code: "BLD-LFT", name: "Liver Function Test (LFT)", department: "Biochemistry", sampleType: "Serum", price: 750, tatHours: 4, active: true },
        { id: "tc_3", type: "xray_type", code: "XRY-CHST", name: "Chest X-Ray PA View (Digital)", department: "Radiology", sampleType: "Imaging", price: 500, tatHours: 1, active: true },
        { id: "tc_4", type: "scan_type", code: "SCN-CT-BRN", name: "CT Brain Plain & Contrast", department: "Radiology", sampleType: "CT Scan", price: 3200, tatHours: 3, active: true },
        { id: "tc_5", type: "other_test", code: "OTH-ECG", name: "12-Lead Digital ECG", department: "Cardiology", sampleType: "Cardiac Tracing", price: 350, tatHours: 1, active: true },
        { id: "tc_6", type: "physiotherapy_test", code: "PHY-EMG", name: "Surface EMG & Gait Evaluation", department: "Physiotherapy", sampleType: "Clinical Eval", price: 900, tatHours: 2, active: true },
        { id: "tc_7", type: "ophthalmology", code: "OPH-OCT", name: "Retinal OCT & Tonometry", department: "Ophthalmology", sampleType: "Optical Scan", price: 1400, tatHours: 2, active: true },
      ],
      autoUploads: [
        { id: "au_1", analyzer: "Sysmex XN-550", barcode: "BAR-90184", patientName: "Robert Vance", patientUhid: "CURA-2026-0001", testName: "Complete Blood Count (CBC)", hl7Summary: "Hb 14.2 g/dL | WBC 7.2k | PLT 240k", receivedAt: now, status: "pending_verify" },
      ],
    },
    cashier: {
      receipts: [
        { id: "rcpt_1", branchId: "br_main", receiptNumber: "RCPT-2026-1082", patientName: "Kavitha Sundar", patientUhid: "CURA-2026-089", department: "Inpatient IPD", doctorName: "Dr. Arvind Sharma", amount: 14500, discount: 500, paymentMode: "UPI / QR", refNo: "UPI-984210984", cashier: "Cashier Desk 1", date: now, type: "Discharge Settlement", status: "cleared" },
        { id: "rcpt_2", branchId: "br_main", receiptNumber: "RCPT-2026-1083", patientName: "Arunachalam P", patientUhid: "CURA-2026-104", department: "OPD Consultation", doctorName: "Dr. Arvind Sharma", amount: 500, discount: 0, paymentMode: "Cash", refNo: "CASH-SLIP-091", cashier: "Cashier Desk 1", date: now, type: "Doctor Consultation Fee", status: "cleared" },
        { id: "rcpt_3", branchId: "br_main", receiptNumber: "RCPT-2026-1084", patientName: "Deepak Sharma", patientUhid: "CURA-2026-042", department: "Diagnostic Lab", doctorName: "Dr. Priya Nair", amount: 1850, discount: 150, paymentMode: "Credit Card", refNo: "POS-TXN-44910", cashier: "Cashier Desk 2", date: now, type: "Lab Investigation Package", status: "cleared" },
        { id: "rcpt_4", branchId: "br_main", receiptNumber: "RCPT-2026-1085", patientName: "Sanjay Natarajan", patientUhid: "CURA-2026-077", department: "Emergency Triage", doctorName: "Dr. Arvind Sharma", amount: 3500, discount: 0, paymentMode: "Cash", refNo: "EMG-DEP-102", cashier: "Cashier Desk 1", date: now, type: "Emergency Observation Deposit", status: "uncleared" },
      ],
      preBookings: [
        { id: "pb_1", branchId: "br_main", bookingNo: "PB-2026-011", patientName: "Ananya Iyer", patientUhid: "CURA-2026-051", procedure: "Laparoscopic Cholecystectomy", advancePaid: 10000, surgeryDate: "2026-11-28", surgeon: "Dr. Arvind Sharma", status: "Confirmed" },
        { id: "pb_2", branchId: "br_main", bookingNo: "PB-2026-012", patientName: "Vijay Anand", patientUhid: "CURA-2026-063", procedure: "Total Knee Replacement", advancePaid: 25000, surgeryDate: "2026-12-02", surgeon: "Dr. Priya Nair", status: "Confirmed" },
      ],
      emergencyLogs: [
        { id: "emg_1", branchId: "br_main", caseNumber: "ER-2026-301", patientName: "Sanjay Natarajan", triageLevel: "Priority 1 - Red", arrivalMode: "Ambulance", depositPaid: 3500, status: "Under Observation", timestamp: now },
      ],
    },
    accounts: {
      accounts: [
        { id: "acc_1", code: "1001", name: "Main Cash Counter Drawer", type: "Asset", group: "Cash-in-Hand", balance: 14500, branchId: "br_main" },
        { id: "acc_2", code: "1020", name: "HDFC Hospital Current A/c", type: "Asset", group: "Bank Accounts", balance: 842000, branchId: "br_main" },
        { id: "acc_3", code: "4010", name: "OPD & IPD Medical Revenue", type: "Income", group: "Direct Incomes", balance: 1250000, branchId: "br_main" },
        { id: "acc_4", code: "5020", name: "Medical Gas & Pharmacy Supplies", type: "Expense", group: "Direct Expenses", balance: 312000, branchId: "br_main" },
      ],
      cashCloseLogs: [
        {
          id: "cc_1",
          branchId: "br_main",
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
          createdAt: now,
        },
      ],
      expenses: [
        { id: "exp_1", branchId: "br_main", voucherNumber: "VCH-2026-081", category: "Medical Supplies", description: "Emergency Oxygen Cylinder Refill Batch (10 Cylinders)", amount: 4500, paidTo: "Southern Gas Agency", paymentMode: "Bank Transfer", date: "2026-11-22", approvedBy: "Admin Kumaran", status: "paid", createdAt: now },
        { id: "exp_2", branchId: "br_main", voucherNumber: "VCH-2026-082", category: "Utilities", description: "Hospital Diesel Generator Fuel (500 Liters)", amount: 48000, paidTo: "Indian Oil Fuel Depot", paymentMode: "UPI", date: "2026-11-23", approvedBy: "Admin Kumaran", status: "paid", createdAt: now },
        { id: "exp_3", branchId: "br_main", voucherNumber: "VCH-2026-083", category: "Petty Cash", description: "Patient Front-Desk Drinking Water & Housekeeping Supplies", amount: 1250, paidTo: "Metro Refreshments", paymentMode: "Cash", date: today, approvedBy: "Cashier", status: "pending", createdAt: now },
      ],
      receivables: [
        { id: "rec_1", branchId: "br_main", billNumber: "CLM-TPA-9012", debtorName: "Star Health & Allied Insurance", category: "TPA / Insurance", amount: 85000, receivedAmount: 60000, balanceDue: 25000, claimDate: "2026-11-15", dueDate: "2026-12-15", status: "partial", referenceNumber: "STAR-CLM-88912", createdAt: now },
        { id: "rec_2", branchId: "br_main", billNumber: "CORP-9812", debtorName: "L&T Construction Health Scheme", category: "Corporate Tie-up", amount: 42000, receivedAmount: 0, balanceDue: 42000, claimDate: "2026-11-18", dueDate: "2026-12-18", status: "pending", referenceNumber: "LT-CORP-401", createdAt: now },
      ],
      doctorIncomes: [
        { id: "di_1", doctorId: "doc_1", doctorName: "Dr. Arvind Sharma", department: "General Medicine", month: "2026-11", totalConsultations: 142, opdShareAmount: 42600, ipdProceduresAmount: 28000, grossPayable: 70600, tdsDeduction: 7060, netPaid: 63540, paymentDate: "2026-11-20", paymentMode: "Bank Transfer", status: "paid", referenceNumber: "NEFT-HDFC-9912048" },
        { id: "di_2", doctorId: "doc_2", doctorName: "Dr. Priya Nair", department: "Cardiology", month: "2026-11", totalConsultations: 98, opdShareAmount: 29400, ipdProceduresAmount: 15000, grossPayable: 44400, tdsDeduction: 4440, netPaid: 39960, paymentDate: "2026-11-20", paymentMode: "Bank Transfer", status: "paid", referenceNumber: "NEFT-HDFC-9912049" },
      ],
    },
    certificates: [
      { id: "cert_1", branchId: "br_main", certificateType: "birth", certificateNumber: "BC-2026-0041", patientId: "p_101", patientName: "Baby of Meenakshi", patientUhid: "CURA-2026-104", patientAge: 0, patientGender: "Female", doctorName: "Dr. Arvind Sharma", issueDate: "2026-11-20", purpose: "Official Birth Registration", details: { timeOfBirth: "04:22 AM", motherName: "Meenakshi Sundaram", fatherName: "Sundaram Ramanathan", birthWeightKg: 3.2, deliveryType: "Normal Vaginal Delivery" }, status: "issued", createdAt: now },
      { id: "cert_2", branchId: "br_main", certificateType: "medical", certificateNumber: "MC-2026-0182", patientId: "p_102", patientName: "Rajesh Kannan", patientUhid: "CURA-2026-089", patientAge: 34, patientGender: "Male", doctorName: "Dr. Arvind Sharma", issueDate: "2026-11-22", validUntil: "2026-11-29", purpose: "Medical Leave Recommendation", diagnosis: "Acute Bronchitis with High Grade Fever", details: { restDaysRecommended: 7 }, status: "issued", createdAt: now },
      { id: "cert_3", branchId: "br_main", certificateType: "fitness", certificateNumber: "FC-2026-0094", patientId: "p_103", patientName: "Deepa Ramachandran", patientUhid: "CURA-2026-061", patientAge: 27, patientGender: "Female", doctorName: "Dr. Priya Nair", issueDate: "2026-11-23", purpose: "Pre-Employment Physical Fitness", details: { fitnessStatement: "Fit for active commercial corporate duties" }, status: "issued", createdAt: now },
    ],
    equipments: {
      equipments: [
        { id: "eq_1", branchId: "br_main", name: "Hamilton C6 Intensive Care Ventilator", model: "HAM-C6-PRO", serialNumber: "SN-VNT-88192", department: "ICU (Bay 1)", location: "Main ICU Complex Room 102", status: "working", purchaseDate: "2024-03-15", warrantyExpiry: "2027-03-14", amcVendor: "Hamilton Medical India", lastServiceDate: "2026-10-12", nextServiceDue: "2027-01-12", createdAt: now },
        { id: "eq_2", branchId: "br_main", name: "Philips HeartStart XL+ Biphasic Defibrillator", model: "XL-PLUS-2024", serialNumber: "SN-DFB-40912", department: "Emergency / Trauma", location: "Crash Cart Bay A", status: "working", purchaseDate: "2023-08-10", warrantyExpiry: "2026-08-09", amcVendor: "Philips Healthcare", lastServiceDate: "2026-11-01", nextServiceDue: "2027-02-01", createdAt: now },
        { id: "eq_3", branchId: "br_main", name: "Mindray BeneView T8 Multi-Para Patient Monitor", model: "BV-T8-ULTRA", serialNumber: "SN-MON-99102", department: "Operation Theatre (OT 2)", location: "Main Surgical Suite", status: "calibration_due", purchaseDate: "2024-01-20", warrantyExpiry: "2027-01-19", amcVendor: "Mindray Bio-Medical", lastServiceDate: "2026-08-15", nextServiceDue: "2026-11-15", createdAt: now },
        { id: "eq_4", branchId: "br_main", name: "Tuttnauer 3870E Large Autoclave Sterilizer", model: "3870E-AUTO", serialNumber: "SN-STZ-11928", department: "CSSD (Sterilization)", location: "Ground Floor CSSD Dept", status: "under_maintenance", purchaseDate: "2023-11-05", amcVendor: "Tuttnauer India Support", lastServiceDate: "2026-11-18", nextServiceDue: "2026-11-26", createdAt: now },
      ],
      worksheets: [
        { id: "ws_1", date: today, equipmentId: "eq_1", equipmentName: "Hamilton C6 Ventilator", checkedBy: "Engr. Sundar (BME)", status: "operational", actionTaken: "Pre-use calibration test & O2 cell sensor check passed.", remarks: "All pressure alarms functioning within tolerance." },
        { id: "ws_2", date: today, equipmentId: "eq_2", equipmentName: "Philips HeartStart Defibrillator", checkedBy: "Engr. Sundar (BME)", status: "operational", actionTaken: "30-Joule discharge self-test verified. Battery status 100%.", remarks: "Pads expiration checked: Valid till Oct 2027." },
      ],
      gatePasses: [
        { id: "gp_1", passNumber: "GP-2026-084", equipmentId: "eq_4", equipmentName: "Tuttnauer 3870E Steam Pressure Chamber Assembly", purpose: "Repair", vendorName: "Precision Bio-Engineering Services", issuedDate: "2026-11-20", expectedReturnDate: "2026-11-27", status: "outward", authorizedBy: "Biomedical Engr. Sundar", contactPerson: "Mr. Karthik (+91 98400 12345)", remarks: "High pressure chamber seal replacement under warranty", createdAt: now },
        { id: "gp_2", passNumber: "GP-2026-085", equipmentName: "Drager Anesthesia Vaporizer (Sevoflurane)", purpose: "Calibration", vendorName: "Drager Medical India Calibration Lab", issuedDate: "2026-11-15", expectedReturnDate: "2026-11-22", actualReturnDate: "2026-11-21", status: "returned", authorizedBy: "Biomedical Engr. Sundar", contactPerson: "Service Desk (+91 44 2400 9000)", remarks: "Annual NABL calibration certificate obtained", createdAt: now },
      ],
      documents: [
        { id: "doc_1", title: "Hamilton C6 Ventilator - Service Manual & Schematics", category: "Service Manual", size: "14.2 MB", uploadDate: "2026-03-15", uploader: "Admin" },
        { id: "doc_2", title: "Philips Defibrillator NABL Calibration Certificate 2026", category: "Calibration Certificate", size: "2.8 MB", uploadDate: "2026-08-10", uploader: "Engr. Sundar" },
      ],
      serviceLogs: [
        { id: "srv_1", equipmentId: "eq_1", equipmentName: "Hamilton C6 Intensive Care Ventilator", serviceDate: "2026-10-12", engineerName: "Engr. Sundar (BME)", description: "Quarterly PM & O2 sensor replacement", cost: 4200 },
      ],
    },
    admin: {
      employees: [
        { id: "EMP-101", code: "CURA-EMP-001", name: "Dr. Arvind Sharma", department: "General Medicine", designation: "Chief Physician", role: "doctor", phone: "+91 98401 22334", email: "arvind.sharma@curatech.org", dateOfJoin: "2022-01-15", basicSalary: 185000, status: "Active" },
        { id: "EMP-102", code: "CURA-EMP-002", name: "Dr. Priya Nair", department: "Cardiology", designation: "Consultant Cardiologist", role: "doctor", phone: "+91 98402 33445", email: "priya.nair@curatech.org", dateOfJoin: "2023-03-01", basicSalary: 160000, status: "Active" },
        { id: "EMP-103", code: "CURA-EMP-003", name: "Sarah Jenkins, RN", department: "ICU Nursing", designation: "Head Nurse", role: "nurse", phone: "+91 98403 44556", email: "sarah.j@curatech.org", dateOfJoin: "2021-08-10", basicSalary: 55000, status: "Active" },
        { id: "EMP-104", code: "CURA-EMP-004", name: "K. Mohan Kumar", department: "Front Desk", designation: "Senior Receptionist", role: "receptionist", phone: "+91 98404 55667", email: "mohan.reception@curatech.org", dateOfJoin: "2023-11-01", basicSalary: 32000, status: "Active" },
        { id: "EMP-105", code: "CURA-EMP-005", name: "Vikram Sethi", department: "Diagnostics", designation: "Chief Lab Technologist", role: "lab_tech", phone: "+91 98405 66778", email: "vikram.lab@curatech.org", dateOfJoin: "2022-06-20", basicSalary: 48000, status: "Active" },
      ],
      schedules: [
        { id: "SCH-1", doctorId: "doc_1", doctorName: "Dr. Arvind Sharma", specialty: "General Medicine", opdDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], timing: "09:00 AM - 01:00 PM", room: "OPD Suite 101", maxTokens: 30, status: "Available" },
        { id: "SCH-2", doctorId: "doc_2", doctorName: "Dr. Priya Nair", specialty: "Interventional Cardiology", opdDays: ["Mon", "Wed", "Fri", "Sat"], timing: "10:00 AM - 02:00 PM", room: "OPD Suite 105", maxTokens: 25, status: "Available" },
      ],
      attendance: [
        { id: "att_1", empCode: "CURA-EMP-001", name: "Dr. Arvind Sharma", department: "General Medicine", date: today, inTime: "08:52 AM", outTime: "—", status: "Present" },
        { id: "att_2", empCode: "CURA-EMP-003", name: "Sarah Jenkins, RN", department: "ICU Nursing", date: today, inTime: "07:00 AM", outTime: "—", status: "Present" },
        { id: "att_3", empCode: "CURA-EMP-005", name: "Vikram Sethi", department: "Diagnostics", date: today, inTime: "08:15 AM", outTime: "—", status: "Present" },
      ],
      payrollRuns: [],
      allotments: [
        { id: "alt_1", roomOrAsset: "OPD Suite 101", allottedTo: "Dr. Arvind Sharma", department: "General Medicine", shift: "Morning", status: "Active", updatedAt: now },
        { id: "alt_2", roomOrAsset: "ICU Isolation Bay 1", allottedTo: "Sarah Jenkins, RN", department: "Critical Care", shift: "Day", status: "Active", updatedAt: now },
      ],
      idCardForwards: [],
      phnMerges: [],
      roleMenuMap: {},
    },
    physiotherapy: {
      items: [
        { id: "PHY-001", name: "Cervical Collar (Soft Firm - Medium)", category: "Support & Braces", price: 650, stock: 32, reorderLevel: 10, unit: "Pcs" },
        { id: "PHY-002", name: "Lumbo-Sacral (L.S.) Support Belt (Large)", category: "Support & Braces", price: 1450, stock: 24, reorderLevel: 8, unit: "Pcs" },
        { id: "PHY-003", name: "TENS Digital Electrode Gel Pads (Set of 4)", category: "Electrotherapy Acc", price: 380, stock: 85, reorderLevel: 25, unit: "Sets" },
        { id: "PHY-004", name: "TheraBand Resistance Loop Band (Heavy Blue)", category: "Resistance & Exercise", price: 520, stock: 45, reorderLevel: 15, unit: "Pcs" },
        { id: "PHY-005", name: "Swiss Balance Ball (65 cm with Pump)", category: "Resistance & Exercise", price: 1200, stock: 12, reorderLevel: 5, unit: "Pcs" },
        { id: "PHY-006", name: "Ultrasound Therapy Transmission Gel (5 Litre Can)", category: "Therapy Modality", price: 850, stock: 18, reorderLevel: 6, unit: "Cans" },
      ],
      sales: [
        {
          id: "PS-2026-001",
          billNumber: "PHY-BILL-1001",
          patientId: "P-101",
          patientName: "K. Rajeshwari",
          patientUhid: "CURA-2026-0012",
          items: [
            { itemId: "PHY-002", name: "Lumbo-Sacral (L.S.) Support Belt (Large)", qty: 1, price: 1450, total: 1450 },
          ],
          subtotal: 1450,
          discount: 0,
          total: 1450,
          paymentMode: "UPI",
          date: today,
          attendedBy: "Dr. K. Senthil, PT",
        },
      ],
      returns: [],
      purchaseOrders: [
        { id: "PPO-1", poNumber: "PO-PHY-8801", vendor: "Apex Ortho Supplies", category: "Support & Braces", amount: 38500, date: today, status: "Delivered" },
      ],
      vendors: [
        { id: "V-PHY-1", name: "Apex Ortho & Rehabilitation Supplies", contact: "+91 94440 11223", city: "Chennai", gstin: "33AABCA1234F1Z1" },
        { id: "V-PHY-2", name: "TheraHealth Electro-Med Equipment Corp", contact: "+91 94441 22334", city: "Bengaluru", gstin: "29AABCT5678F1Z2" },
      ],
    },
    store: {
      items: [
        { id: "SI-001", code: "ST-SURG-01", name: "Surgical Sterile Gloves 7.5 (Box of 50 pairs)", category: "Disposables & PPE", stock: 140, unit: "Box", unitCost: 450, reorderLevel: 30, supplier: "SurgeCare Lifesciences", location: "Bin A-12" },
        { id: "SI-002", code: "ST-PPE-02", name: "3-Ply Surgical Face Masks (Box of 100)", category: "Disposables & PPE", stock: 260, unit: "Box", unitCost: 120, reorderLevel: 50, supplier: "MedShield Hygiene", location: "Bin A-15" },
        { id: "SI-003", code: "ST-LIN-03", name: "Hospital Bed Linen Bedspread (White Cotton Heavy)", category: "Linen & Bedding", stock: 85, unit: "Nos", unitCost: 380, reorderLevel: 25, supplier: "Apex Healthcare Textiles", location: "Shelf L-02" },
        { id: "SI-004", code: "ST-STAT-04", name: "Patient Case File Folders with Hospital Logo", category: "Hospital Stationery", stock: 450, unit: "Nos", unitCost: 35, reorderLevel: 100, supplier: "Metro Printworks", location: "Shelf S-04" },
        { id: "SI-005", code: "ST-CHEM-05", name: "Surface Disinfectant Floor Cleaner (5L Canister)", category: "Sanitation & Chemical", stock: 34, unit: "Canister", unitCost: 650, reorderLevel: 10, supplier: "CleanBio Solutions", location: "Chem Store Room" },
      ],
      indents: [
        { id: "IND-01", indentNo: "IND-2026-0045", department: "Intensive Care Unit (ICU)", indentBy: "Sarah Jenkins, RN", date: today, items: [{ code: "ST-SURG-01", name: "Surgical Sterile Gloves 7.5 (Box of 50 pairs)", qty: 10, unit: "Box" }], status: "Fulfilled" },
      ],
      returns: [],
      purchaseOrders: [
        { id: "SPO-1", poNumber: "PO-ST-9912", vendor: "SurgeCare Lifesciences", desc: "Gloves, Syringes & PPE", amount: 58500, payStatus: "Pending", due: "15 Days", date: today },
        { id: "SPO-2", poNumber: "PO-ST-9913", vendor: "Apex Healthcare Textiles", desc: "White Cotton Bedspreads", amount: 38000, payStatus: "Cleared", due: "Paid", date: today },
      ],
      vendors: [
        { id: "SV-1", name: "SurgeCare Lifesciences", contact: "+91 98401 55110", gstin: "33AABCS1122K1Z9", category: "Disposables & PPE" },
        { id: "SV-2", name: "Apex Healthcare Textiles", contact: "+91 98402 66220", gstin: "33AABCA9988K1Z4", category: "Linen & Bedding" },
      ],
      documents: [
        { id: "SDOC-1", title: "SurgeCare DC #DC-4401", date: "2026-10-18", size: "1.4 MB", type: "Delivery Challan" },
        { id: "SDOC-2", title: "Apex Textiles Annual Contract 2026", date: "2026-08-10", size: "4.8 MB", type: "MOU / Agreement" },
      ],
    },
    ambulance: {
      vehicles: [
        { id: "VEH-1", vehicleNumber: "TN 01 AB 1008", type: "Advanced Life Support (ALS)", status: "available", driverName: "S. Murugan", driverPhone: "+91 98840 12345", paramedicName: "Sister Geetha, EMT", oxygenLevelPercent: 96, currentOdometer: 42150, fuelLevel: "Full", lastServiceDate: "2026-10-10", fitnessValidUntil: "2027-04-30" },
        { id: "VEH-2", vehicleNumber: "TN 01 CD 2040", type: "Advanced Life Support (ALS)", status: "on_trip", driverName: "K. Ramesh", driverPhone: "+91 98841 23456", paramedicName: "Brother Anand, EMT", oxygenLevelPercent: 88, currentOdometer: 58200, fuelLevel: "3/4", lastServiceDate: "2026-09-28", fitnessValidUntil: "2027-02-15" },
        { id: "VEH-3", vehicleNumber: "TN 01 EF 3055", type: "Basic Life Support (BLS)", status: "available", driverName: "M. Selvam", driverPhone: "+91 98842 34567", paramedicName: "Sister Mary, EMT", oxygenLevelPercent: 92, currentOdometer: 31400, fuelLevel: "Full", lastServiceDate: "2026-10-05", fitnessValidUntil: "2027-06-30" },
      ],
      trips: [
        { id: "TRIP-101", tripNumber: "AMB-TRIP-2026-081", vehicleId: "VEH-2", vehicleNumber: "TN 01 CD 2040", patientName: "V. Somasekar (Cardiac Emergency)", pickupLocation: "Anna Nagar West, 4th Avenue", dropLocation: "Cura Tech Emergency & Trauma Bay", startTime: "13:40", distanceKm: 14.5, tripCharge: 2500, status: "dispatched", paymentStatus: "pending", driverName: "K. Ramesh", urgency: "Emergency", notes: "Patient on 10L Oxygen", createdAt: now },
      ],
    },
    skin: {
      records: [
        { id: "SKIN-REC-01", patientId: "P-101", patientName: "Meenakshi Sundaram", patientUhid: "CURA-2026-0012", procedureName: "CO2 Fractional Laser Resurfacing", doctorName: "Dr. Sunita Kapoor, MD (Derm)", date: today, sittingNumber: 2, totalSittings: 4, charge: 4500, skinType: "Fitzpatrick Type IV", beforeNotes: "Post-acne scars", procedureNotes: "25mJ energy under topical EMLA anesthesia.", afterCareAdvice: "Strict physical sun avoidance 72 hrs.", prescribedTopicals: ["Avene Cicalfate+", "La Roche-Posay SPF50"], status: "completed" },
      ],
      products: [
        { id: "PROD-1", name: "DermShield Ultra Matte Sunscreen SPF 50+ PA++++ (50g)", price: 780, stock: 45 },
        { id: "PROD-2", name: "BioBarrier Ceramide Repair Moisturizer (100ml)", price: 620, stock: 38 },
        { id: "PROD-3", name: "Pure C15 L-Ascorbic Acid Radiance Serum (30ml)", price: 1450, stock: 22 },
      ],
    },
    maintenance: {
      workOrders: [
        { id: "WO-01", ticketNumber: "WO-2026-051", area: "Operation Theatre", issue: "OT 2 Laminar airflow HEPA filter differential pressure alarm triggering", priority: "Critical", assignedTo: "M. Balaji (Sr. Bio-Engg)", status: "in_progress", reportedDate: today, cost: 4500 },
        { id: "WO-02", ticketNumber: "WO-2026-052", area: "HVAC & Generator", issue: "250 kVA Generator diesel transfer pump solenoid valve leak", priority: "High", assignedTo: "K. Saravanan (Electrical)", status: "open", reportedDate: today, cost: 2800 },
      ],
      amcContracts: [
        { id: "AMC-1", system: "Siemens Magnetom 1.5T MRI", vendor: "Siemens Healthcare India", coverage: "Comprehensive (CMC)", annualFee: 1250000, expiry: "2027-03-31", status: "Active" },
        { id: "AMC-2", system: "GE Healthcare Optima CT660", vendor: "GE Medical Systems", coverage: "Comprehensive (CMC)", annualFee: 980000, expiry: "2027-06-30", status: "Active" },
      ],
    },
  };
}

let cachedState = null;
let cachedMtimeMs = 0;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadErpState() {
  ensureDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const stat = fs.statSync(DATA_FILE);
      if (!cachedState || stat.mtimeMs !== cachedMtimeMs) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        cachedState = { ...createInitialState(), ...parsed };
        cachedMtimeMs = stat.mtimeMs;
      }
      return cachedState;
    } catch (err) {
      console.warn("[erpStore] Failed reading disk store, resetting defaults:", err.message);
    }
  }
  cachedState = createInitialState();
  saveErpState(cachedState);
  return cachedState;
}

export function saveErpState(state) {
  ensureDir();
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmpFile, DATA_FILE);
  try {
    cachedMtimeMs = fs.statSync(DATA_FILE).mtimeMs;
  } catch {}
  cachedState = state;
  return state;
}

export function mutateErpState(mutator) {
  const current = loadErpState();
  const result = mutator(current);
  saveErpState(current);
  return result;
}

/**
 * Best-effort sync to Firestore collection without failing API calls if Firestore rules
 * haven't been republished yet. Also mirrors to gp_meta/erp_snapshot when helpful.
 */
export async function syncFirestoreDoc(collectionName, docId, payload) {
  if (!collectionName || !docId || !payload) return false;
  try {
    const clean = sanitizeValue(payload) || {};
    await setDoc(doc(db, collectionName, String(docId)), clean, { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function readFirestoreCollection(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return null;
  }
}

export async function readFirestoreDoc(collectionName, docId) {
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

export { COLLECTIONS };
