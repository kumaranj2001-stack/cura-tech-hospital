/**
 * Initial seed dataset for CuraTech Hospital Management ERP.
 * Used automatically in Local Sandbox mode and available via
 * Admin -> System Settings -> "Seed Sample Hospital Data" for fresh Firestore.
 */

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    app_home: true,
    curatech: true,
    patient: true,
    doctor: true,
    lab: true,
    pharmacy: true,
    cashier: true,
    maintenance: true,
    accounts: true,
    reports: true,
    certificate: true,
    equipments: true,
    admin: true,
    physiotherapy: true,
    store: true,
    ambulance: true,
    skin: true,
    approve_grn: true,
    manage_inventory_settings: true,
    view_financial_reports: true,
    manage_users: true,
    void_bills: true
  },
  staff: {
    app_home: true,
    curatech: true,
    patient: true,
    doctor: false,
    lab: true,
    pharmacy: true,
    cashier: true,
    maintenance: false,
    accounts: false,
    reports: false,
    certificate: true,
    equipments: false,
    admin: false,
    physiotherapy: true,
    store: true,
    ambulance: true,
    skin: true,
    approve_grn: false,
    manage_inventory_settings: false,
    view_financial_reports: false,
    manage_users: false,
    void_bills: false
  }
};

export const INITIAL_SANDBOX_USERS = [
  {
    id: "uid_kumaran",
    username: "kumaran",
    email: "kumaran@curatech.hospital",
    fullName: "KUMARAN (Administrator)",
    role: "admin",
    department: "Administration",
    active: true,
    passwordHash: "2f0b4bc7c555480b0342edd8a55fd47f88d45a6e849d81244990aa553dacc7e6",
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.admin },
    createdAt: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "uid_staff123",
    username: "staff123",
    email: "staff123@curatech.hospital",
    fullName: "FRONT OFFICE & BILLING STAFF",
    role: "staff",
    department: "Reception & Pharmacy",
    active: true,
    passwordHash: "db84c0ae35d5b1b12e5edea664144fa95c5e23e1ff8cce1c32b0a04f4fadafb1",
    permissions: { ...DEFAULT_ROLE_PERMISSIONS.staff },
    createdAt: "2026-11-01T08:05:00.000Z"
  }
];

export function buildSampleSeedCollections(todayISO) {
  const today = todayISO || new Date().toISOString().slice(0, 10);
  return {
    settings: [
      {
        id: "hospital_config",
        hospitalName: "CuraTech Hospital Management",
        branchName: "Main Hospital & Pharmacy",
        address: "124 Health Avenue, Medical Square, Chennai - 600001",
        phone: "+91 98400 11223",
        email: "care@curatech.hospital",
        gstin: "33AABCC1234F1Z5",
        drugLicenseNo: "TN-CHE-20B-2026-00412",
        receiptFooter: "Thank you for visiting CuraTech Hospital. Get well soon!",
        autoLogoutMinutes: 15,
        strictLogoutOnHide: false,
        defaultTaxSlab: 12,
        smsWebhookUrl: "",
        lowStockThreshold: 20,
        expiryWarningDays: 60
      }
    ],
    patients: [
      {
        id: "PAT-1001",
        uhid: "CTH-2026-1001",
        fullName: "ARAVIND SWAMINATHAN",
        age: 38,
        gender: "Male",
        phone: "9876543210",
        bloodGroup: "O+",
        address: "14 Gandhi Nagar, Anna Salai",
        city: "Chennai",
        emergencyContact: "Lakshmi (9876501122)",
        referralSource: "Walk-in",
        insuranceProvider: "Star Health",
        policyNumber: "SH-889912",
        allergies: "Penicillin",
        createdAt: today + "T08:30:00.000Z"
      },
      {
        id: "PAT-1002",
        uhid: "CTH-2026-1002",
        fullName: "PRIYA DHARSHINI",
        age: 29,
        gender: "Female",
        phone: "9840123456",
        bloodGroup: "A+",
        address: "22 Lake View Road",
        city: "Coimbatore",
        emergencyContact: "Karthik (9840199999)",
        referralSource: "Dr. Meenakshi",
        insuranceProvider: "Self Pay",
        policyNumber: "",
        allergies: "None",
        createdAt: today + "T09:10:00.000Z"
      },
      {
        id: "PAT-1003",
        uhid: "CTH-2026-1003",
        fullName: "SUNDARAMURTHY V",
        age: 62,
        gender: "Male",
        phone: "9443122334",
        bloodGroup: "B+",
        address: "8 Temple Street, Mylapore",
        city: "Chennai",
        emergencyContact: "Ramesh (9443188776)",
        referralSource: "Old Patient",
        insuranceProvider: "CMCHIS",
        policyNumber: "TN-CM-99220",
        allergies: "Sulfa Drugs",
        createdAt: today + "T09:40:00.000Z"
      }
    ],
    doctors: [
      { id: "DOC-1", name: "Dr. Thiruppathi R", specialisation: "General Medicine", fee: 400, sharePercent: 60, phone: "9840055001", active: true },
      { id: "DOC-2", name: "Dr. Meenakshi S", specialisation: "Obstetrics & Gynaecology", fee: 500, sharePercent: 65, phone: "9840055002", active: true },
      { id: "DOC-3", name: "Dr. Vignesh K", specialisation: "Orthopaedics & Physio", fee: 450, sharePercent: 60, phone: "9840055003", active: true },
      { id: "DOC-4", name: "Dr. Ananya M", specialisation: "Dermatology & Skin", fee: 550, sharePercent: 60, phone: "9840055004", active: true }
    ],
    rooms: [
      { id: "BED-101", ward: "General Ward A", roomNo: "GW-101", category: "General", ratePerDay: 800, status: "Occupied", patientUhid: "CTH-2026-1003", patientName: "SUNDARAMURTHY V", housekeeping: "Clean" },
      { id: "BED-102", ward: "General Ward A", roomNo: "GW-102", category: "General", ratePerDay: 800, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" },
      { id: "BED-201", ward: "Semi-Private", roomNo: "SP-201", category: "Semi-Private", ratePerDay: 1800, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" },
      { id: "BED-202", ward: "Private Suite", roomNo: "PR-202", category: "Private", ratePerDay: 3200, status: "Cleaning", patientUhid: "", patientName: "", housekeeping: "Sanitizing" },
      { id: "BED-301", ward: "ICU", roomNo: "ICU-01", category: "ICU", ratePerDay: 5500, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" }
    ],
    op_visits: [
      {
        id: "OP-2026-001",
        tokenNo: 1,
        visitDate: today,
        uhid: "CTH-2026-1001",
        patientName: "ARAVIND SWAMINATHAN",
        doctorId: "DOC-1",
        doctorName: "Dr. Thiruppathi R",
        visitType: "New OP",
        fee: 400,
        status: "Prescreened",
        paymentStatus: "Paid",
        vitals: { bp: "126/82", pulse: "78", temp: "99.1", height: "172", weight: "74", bmi: "25.0", spo2: "98", complaint: "Fever & body ache x 2 days" }
      },
      {
        id: "OP-2026-002",
        tokenNo: 2,
        visitDate: today,
        uhid: "CTH-2026-1002",
        patientName: "PRIYA DHARSHINI",
        doctorId: "DOC-2",
        doctorName: "Dr. Meenakshi S",
        visitType: "Follow-Up",
        fee: 500,
        status: "Waiting",
        paymentStatus: "Pending",
        vitals: null
      }
    ],
    ip_admissions: [
      {
        id: "IP-2026-001",
        uhid: "CTH-2026-1003",
        patientName: "SUNDARAMURTHY V",
        doctorName: "Dr. Thiruppathi R",
        ward: "General Ward A",
        roomNo: "GW-101",
        admitDate: today,
        diagnosis: "Uncontrolled Type 2 DM & Dehydration",
        diet: "Diabetic Low-Salt Soft Diet",
        advancePaid: 5000,
        status: "Admitted",
        charges: [
          { date: today, item: "Bed Charges (Day 1)", qty: 1, rate: 800, amount: 800 },
          { date: today, item: "IV Fluids & Nursing Care", qty: 1, rate: 650, amount: 650 }
        ]
      }
    ],
    medicines: [
      { id: "MED-01", name: "Paracetamol 650mg Tab", generic: "Acetaminophen", type: "Tablet", manufacturer: "Micro Labs", hsn: "300490", batchNo: "PCM26A", expiry: "2027-08-31", stock: 420, mrp: 35, purchaseRate: 22, gstPercent: 12, barcode: "890100101" },
      { id: "MED-02", name: "Amoxycillin + Clavulanate 625mg", generic: "Co-Amoxiclav", type: "Tablet", manufacturer: "Cipla Ltd", hsn: "300410", batchNo: "AUG26B", expiry: "2027-05-30", stock: 165, mrp: 220, purchaseRate: 155, gstPercent: 12, barcode: "890100102" },
      { id: "MED-03", name: "Pantoprazole 40mg Gastro", generic: "Pantoprazole", type: "Tablet", manufacturer: "Sun Pharma", hsn: "300490", batchNo: "PAN26C", expiry: "2027-11-30", stock: 290, mrp: 95, purchaseRate: 60, gstPercent: 12, barcode: "890100103" },
      { id: "MED-04", name: "Azithromycin 500mg Tab", generic: "Azithromycin", type: "Tablet", manufacturer: "Alembic", hsn: "300420", batchNo: "AZI26D", expiry: "2026-12-20", stock: 14, mrp: 118, purchaseRate: 78, gstPercent: 12, barcode: "890100104" },
      { id: "MED-05", name: "Metformin 500mg SR", generic: "Metformin", type: "Tablet", manufacturer: "USV Pvt Ltd", hsn: "300490", batchNo: "MET26E", expiry: "2028-02-28", stock: 540, mrp: 48, purchaseRate: 30, gstPercent: 5, barcode: "890100105" },
      { id: "MED-06", name: "Cough Relief Syrup 100ml", generic: "Dextromethorphan + CPM", type: "Syrup", manufacturer: "Dr. Reddy's", hsn: "300490", batchNo: "SYR26F", expiry: "2027-04-30", stock: 68, mrp: 135, purchaseRate: 88, gstPercent: 12, barcode: "890100106" }
    ],
    pharmacy_purchases: [
      {
        id: "GRN-2026-001",
        grnDate: today,
        invoiceNo: "INV-CIP-9921",
        supplier: "MedPlus Distributors",
        type: "Purchase",
        items: [
          { medId: "MED-01", medName: "Paracetamol 650mg Tab", batchNo: "PCM26Z", expiry: "2028-01-31", qty: 100, rate: 21, mrp: 35, gstPercent: 12, total: 2352 }
        ],
        subTotal: 2100,
        gstAmount: 252,
        netTotal: 2352,
        status: "Pending Approval",
        enteredBy: "staff123",
        approvedBy: ""
      }
    ],
    pharmacy_sales: [
      {
        id: "PHB-2026-001",
        billDate: today,
        uhid: "CTH-2026-1001",
        patientName: "ARAVIND SWAMINATHAN",
        saleType: "Prescription",
        items: [
          { medId: "MED-01", medName: "Paracetamol 650mg Tab", batchNo: "PCM26A", qty: 2, mrp: 35, gstPercent: 12, amount: 70 },
          { medId: "MED-03", medName: "Pantoprazole 40mg Gastro", batchNo: "PAN26C", qty: 1, mrp: 95, gstPercent: 12, amount: 95 }
        ],
        subTotal: 147.32,
        gstAmount: 17.68,
        discount: 0,
        netTotal: 165,
        paymentMode: "UPI",
        status: "Paid",
        billedBy: "staff123"
      }
    ],
    lab_tests_master: [
      { id: "TST-1", category: "Bloodtest", name: "Complete Blood Count (CBC)", unit: "cells/cumm", normalRange: "4000 - 11000", price: 350, tatHours: 2 },
      { id: "TST-2", category: "Bloodtest", name: "Fasting Blood Sugar (FBS)", unit: "mg/dL", normalRange: "70 - 100", price: 120, tatHours: 1 },
      { id: "TST-3", category: "Bloodtest", name: "Lipid Profile", unit: "mg/dL", normalRange: "Total < 200", price: 650, tatHours: 4 },
      { id: "TST-4", category: "XRay Type", name: "Chest X-Ray PA View", unit: "Film", normalRange: "Clear lung fields", price: 450, tatHours: 1 },
      { id: "TST-5", category: "Scan Type", name: "USG Whole Abdomen", unit: "Report", normalRange: "Normal study", price: 1200, tatHours: 3 },
      { id: "TST-6", category: "Other Test", name: "12-Lead ECG", unit: "Tracing", normalRange: "Normal Sinus Rhythm", price: 300, tatHours: 1 },
      { id: "TST-7", category: "Physiotherapy", name: "IFT & Ultrasound Assessment", unit: "Score", normalRange: "Baseline recorded", price: 400, tatHours: 1 },
      { id: "TST-8", category: "Ophthalmology", name: "Auto-Refractometry & Slit Lamp", unit: "Diopters", normalRange: "6/6 Vision", price: 350, tatHours: 1 }
    ],
    lab_orders: [
      {
        id: "LAB-2026-001",
        orderDate: today,
        uhid: "CTH-2026-1001",
        patientName: "ARAVIND SWAMINATHAN",
        doctorName: "Dr. Thiruppathi R",
        category: "Bloodtest",
        testName: "Complete Blood Count (CBC)",
        price: 350,
        source: "Internal",
        status: "Pending",
        resultValue: "",
        unit: "cells/cumm",
        normalRange: "4000 - 11000",
        remarks: "",
        verifiedBy: ""
      }
    ],
    cashier_bills: [
      {
        id: "CSH-2026-001",
        billDate: today,
        uhid: "CTH-2026-1001",
        patientName: "ARAVIND SWAMINATHAN",
        doctorName: "Dr. Thiruppathi R",
        department: "OP Consultation",
        items: [{ desc: "OP Consultation Fee", qty: 1, rate: 400, amount: 400 }],
        grossAmount: 400,
        discount: 0,
        netAmount: 400,
        paidAmount: 400,
        paymentMode: "Cash",
        status: "Paid",
        billedBy: "staff123"
      },
      {
        id: "CSH-2026-002",
        billDate: today,
        uhid: "CTH-2026-1002",
        patientName: "PRIYA DHARSHINI",
        doctorName: "Dr. Meenakshi S",
        department: "OP Consultation",
        items: [{ desc: "OP Consultation Fee", qty: 1, rate: 500, amount: 500 }],
        grossAmount: 500,
        discount: 0,
        netAmount: 500,
        paidAmount: 0,
        paymentMode: "Pending",
        status: "Pending",
        billedBy: "staff123"
      }
    ],
    accounts: [
      { id: "ACC-1", code: "1001", name: "Cash-in-Hand Counter", group: "Asset", balance: 18400 },
      { id: "ACC-2", code: "1002", name: "HDFC Hospital Current A/C", group: "Bank", balance: 142500 },
      { id: "ACC-3", code: "4001", name: "OP & IP Clinical Revenue", group: "Income", balance: 85000 },
      { id: "ACC-4", code: "4002", name: "Pharmacy Counter Revenue", group: "Income", balance: 64200 },
      { id: "ACC-5", code: "5001", name: "Medical Consumables & Reagents", group: "Expense", balance: 21500 }
    ],
    expenses: [
      { id: "EXP-001", date: today, ledger: "Medical Consumables & Reagents", vendor: "Apex Surgicals", amount: 1850, mode: "Cash", narration: "Gloves & Syringes", status: "Pending Approval", createdBy: "staff123" }
    ],
    masters: [
      { id: "M-ICD-1", catalog: "ICD Code", code: "J06.9", name: "Acute upper respiratory infection", details: "Respiratory" },
      { id: "M-ICD-2", catalog: "ICD Code", code: "E11.9", name: "Type 2 diabetes mellitus without complications", details: "Endocrine" },
      { id: "M-ICD-3", catalog: "ICD Code", code: "I10", name: "Essential (primary) hypertension", details: "Cardiovascular" },
      { id: "M-SYM-1", catalog: "Symptoms", code: "SYM01", name: "Pyrexia / High Fever", details: "General" },
      { id: "M-SYM-2", catalog: "Symptoms", code: "SYM02", name: "Dry Cough & Sore Throat", details: "ENT" },
      { id: "M-SUP-1", catalog: "Supplier", code: "SUP01", name: "MedPlus Distributors", details: "GSTIN: 33AAACM1234A1Z1 | Ph: 9840012340" },
      { id: "M-SUP-2", catalog: "Supplier", code: "SUP02", name: "Apollo Pharma Wholesale", details: "GSTIN: 33AAACA5678B1Z2 | Ph: 9840098765" },
      { id: "M-MFR-1", catalog: "Manufacturer", code: "MFR01", name: "Cipla Ltd", details: "India" },
      { id: "M-MFR-2", catalog: "Manufacturer", code: "MFR02", name: "Sun Pharma", details: "India" },
      { id: "M-SRV-1", catalog: "Services", code: "SRV01", name: "Nebulisation Therapy", details: "Rate: 150" },
      { id: "M-SRV-2", catalog: "Services", code: "SRV02", name: "Wound Dressing (Minor)", details: "Rate: 250" },
      { id: "M-FRQ-1", catalog: "Medicine Frequency", code: "1-0-1", name: "Twice Daily After Food (BD)", details: "Morning & Night" },
      { id: "M-FRQ-2", catalog: "Medicine Frequency", code: "1-1-1", name: "Thrice Daily After Food (TDS)", details: "Morning, Noon & Night" },
      { id: "M-FRQ-3", catalog: "Medicine Frequency", code: "0-0-1", name: "Once Daily Bedtime (HS)", details: "Night" }
    ],
    equipments: [
      { id: "EQ-01", name: "Mindray BC-5150 Hematology Analyzer", dept: "Lab", serialNo: "MN-5150-982", nextCalibration: "2027-01-15", amcVendor: "Mindray India", status: "Operational" },
      { id: "EQ-02", name: "GE Voluson Ultrasound Scanner", dept: "Radiology", serialNo: "GE-VOL-221", nextCalibration: "2026-12-10", amcVendor: "GE Healthcare", status: "Operational" },
      { id: "EQ-03", name: "Philips Patient Monitor ICU-01", dept: "ICU", serialNo: "PH-MX40-11", nextCalibration: "2027-03-01", amcVendor: "Philips Med", status: "Operational" }
    ],
    audit_logs: [
      { id: "AUD-1", timestamp: today + "T08:00:00.000Z", user: "kumaran", role: "admin", module: "System", action: "SYSTEM_INIT", details: "CuraTech Hospital ERP initialized" }
    ]
  };
}
