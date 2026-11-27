/**
 * Initial seed dataset for Guru Hospital (Nalam+ ERP).
 * Used automatically in Local Sandbox mode and available via
 * Admin -> System Settings -> "Seed Sample Hospital Data" for fresh Firestore.
 */

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    app_home: true,
    nalam: true,
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
    nalam: true,
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
    email: "kumaran@guruhospital.in",
    fullName: "KUMARAN",
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
    email: "staff123@guruhospital.in",
    fullName: "FRONT OFFICE & PHARMACY STAFF",
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
        hospitalName: "Guru Hospital — Nalam+",
        uhidPrefix: "GH",
        address: "42, Main Bazaar Road, Medical Enclave, Tamil Nadu - 600001",
        phone: "+91 98400 12345",
        gstin: "33AABCG1234D1Z5",
        drugLicenseNo: "TN-CHN-20B-2026-0091",
        lowStockThreshold: 15,
        nearExpiryDays: 90,
        autoLogoutMinutes: 15,
        strictLogoutOnHide: false,
        receiptFooter: "Thank you for visiting Guru Hospital. Get Well Soon!",
        smsWebhookUrl: ""
      }
    ],
    patients: [
      {
        id: "PAT-1001",
        uhid: "GH-2026-1001",
        fullName: "Aravind Swaminathan",
        age: 34,
        gender: "Male",
        bloodGroup: "O+",
        phone: "9876543210",
        emergencyContact: "9876543200",
        address: "18 Gandhi Street, Anna Nagar",
        city: "Chennai",
        referralSource: "Walk-in",
        insuranceProvider: "Star Health",
        policyNo: "SH-889120",
        familyGroupId: "FAM-101",
        createdAt: today
      },
      {
        id: "PAT-1002",
        uhid: "GH-2026-1002",
        fullName: "Lakshmi Narayanan",
        age: 29,
        gender: "Female",
        bloodGroup: "A+",
        phone: "9845011223",
        emergencyContact: "9845011220",
        address: "71 Temple Road, Mylapore",
        city: "Chennai",
        referralSource: "Dr. Meenakshi",
        insuranceProvider: "Self Pay",
        policyNo: "",
        familyGroupId: "FAM-102",
        createdAt: today
      },
      {
        id: "PAT-1003",
        uhid: "GH-2026-1003",
        fullName: "Muthukumar Vel",
        age: 58,
        gender: "Male",
        bloodGroup: "B+",
        phone: "9443123456",
        emergencyContact: "9443123450",
        address: "12 Lake View Colony",
        city: "Madurai",
        referralSource: "Camp Referral",
        insuranceProvider: "CMCHIS",
        policyNo: "TN-CM-4410",
        familyGroupId: "FAM-103",
        createdAt: today
      }
    ],
    op_visits: [
      {
        id: "OP-101",
        visitDate: today,
        tokenNo: "T-01",
        uhid: "GH-2026-1001",
        patientName: "Aravind Swaminathan",
        doctorName: "Dr. S. Karthikeyan (MD)",
        visitType: "New",
        consultationFee: 400,
        vitals: { bp: "122/80", pulse: 76, temp: "98.6", heightCm: 174, weightKg: 72, bmi: "23.8", spo2: 99 },
        chiefComplaint: "Fever and mild sore throat since 2 days",
        diagnosis: "Acute Upper Respiratory Infection",
        icdCode: "J06.9",
        status: "Waiting",
        createdAt: today
      },
      {
        id: "OP-102",
        visitDate: today,
        tokenNo: "T-02",
        uhid: "GH-2026-1002",
        patientName: "Lakshmi Narayanan",
        doctorName: "Dr. R. Meenakshi (DGO)",
        visitType: "Review",
        consultationFee: 500,
        vitals: { bp: "114/74", pulse: 82, temp: "98.4", heightCm: 160, weightKg: 59, bmi: "23.0", spo2: 99 },
        chiefComplaint: "28 weeks antenatal routine checkup",
        diagnosis: "Normal Antenatal Progress",
        icdCode: "Z34.9",
        status: "Completed",
        createdAt: today
      }
    ],
    appointments: [
      { id: "APT-1", date: today, time: "10:30", uhid: "GH-2026-1001", patientName: "Aravind Swaminathan", doctorName: "Dr. S. Karthikeyan (MD)", phone: "9876543210", status: "Confirmed" },
      { id: "APT-2", date: today, time: "11:15", uhid: "GH-2026-1003", patientName: "Muthukumar Vel", doctorName: "Dr. K. Ramesh (MS Ortho)", phone: "9443123456", status: "Scheduled" }
    ],
    beds: [
      { id: "BED-101", ward: "General Ward", roomNo: "GW-01", category: "General", dailyRate: 1200, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" },
      { id: "BED-102", ward: "General Ward", roomNo: "GW-02", category: "General", dailyRate: 1200, status: "Occupied", patientUhid: "GH-2026-1003", patientName: "Muthukumar Vel", housekeeping: "Occupied" },
      { id: "BED-201", ward: "Semi-Private", roomNo: "SP-01", category: "Semi-Private", dailyRate: 2400, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" },
      { id: "BED-202", ward: "Private AC", roomNo: "PR-01", category: "Private AC", dailyRate: 4200, status: "Available", patientUhid: "", patientName: "", housekeeping: "Clean" },
      { id: "BED-301", ward: "ICU", roomNo: "ICU-01", category: "Critical Care", dailyRate: 7500, status: "Cleaning", patientUhid: "", patientName: "", housekeeping: "Sanitizing" }
    ],
    ip_admissions: [
      {
        id: "IP-2026-01",
        admitDate: today,
        uhid: "GH-2026-1003",
        patientName: "Muthukumar Vel",
        doctorName: "Dr. K. Ramesh (MS Ortho)",
        ward: "General Ward",
        roomNo: "GW-02",
        diagnosis: "Lumbar Spondylosis Observation",
        advancePaid: 5000,
        serviceCharges: [
          { date: today, desc: "Nursing & Ward Care", qty: 1, rate: 1200, total: 1200 },
          { date: today, desc: "IV Cannulation & Fluids", qty: 1, rate: 650, total: 650 }
        ],
        dietPlan: "Low Salt Diabetic Soft Diet",
        status: "Admitted"
      }
    ],
    prescriptions: [
      {
        id: "RX-2026-01",
        rxDate: today,
        uhid: "GH-2026-1001",
        patientName: "Aravind Swaminathan",
        doctorName: "Dr. S. Karthikeyan (MD)",
        items: [
          { medId: "MED-001", medName: "Paracetamol 650mg Tab (Dolo)", freq: "1-1-1 After Food", days: 3, qty: 9 },
          { medId: "MED-002", medName: "Amoxicillin + Clavulanic 625mg", freq: "1-0-1 After Food", days: 5, qty: 10 }
        ],
        advice: "Drink warm fluids, review after 3 days",
        status: "Pending Dispense"
      }
    ],
    medicines: [
      { id: "MED-001", name: "Paracetamol 650mg Tab (Dolo)", generic: "Paracetamol", type: "Tablet", manufacturer: "Micro Labs", hsn: "300490", batchNo: "DL2609", expiry: "2028-04-30", stock: 240, mrp: 34, purchaseRate: 22, gstPercent: 12, barcode: "8901234001" },
      { id: "MED-002", name: "Amoxicillin + Clavulanic 625mg", generic: "Co-Amoxiclav", type: "Tablet", manufacturer: "GSK", hsn: "300410", batchNo: "AMX412", expiry: "2027-08-31", stock: 95, mrp: 210, purchaseRate: 148, gstPercent: 12, barcode: "8901234002" },
      { id: "MED-003", name: "Pantoprazole 40mg Gastro Tab", generic: "Pantoprazole", type: "Tablet", manufacturer: "Sun Pharma", hsn: "300490", batchNo: "PAN771", expiry: "2027-11-30", stock: 12, mrp: 118, purchaseRate: 76, gstPercent: 12, barcode: "8901234003" },
      { id: "MED-004", name: "Metformin 500mg SR Tab", generic: "Metformin", type: "Tablet", manufacturer: "USV", hsn: "300490", batchNo: "MET901", expiry: "2028-02-28", stock: 180, mrp: 48, purchaseRate: 30, gstPercent: 5, barcode: "8901234004" },
      { id: "MED-005", name: "Azithromycin 500mg Tab", generic: "Azithromycin", type: "Tablet", manufacturer: "Cipla", hsn: "300420", batchNo: "AZI302", expiry: "2027-01-15", stock: 60, mrp: 132, purchaseRate: 88, gstPercent: 12, barcode: "8901234005" }
    ],
    pharmacy_purchases: [
      {
        id: "GRN-2026-001",
        grnDate: today,
        invoiceNo: "SUP-INV-7712",
        supplier: "Apollo MedSupply Distributors",
        type: "Purchase",
        items: [
          { medId: "MED-003", medName: "Pantoprazole 40mg Gastro Tab", batchNo: "PAN882", expiry: "2028-09-30", qty: 100, rate: 75, mrp: 118, gstPercent: 12, total: 8400 }
        ],
        subTotal: 7500,
        gstAmount: 900,
        netTotal: 8400,
        status: "Pending Approval",
        enteredBy: "staff123",
        approvedBy: ""
      }
    ],
    pharmacy_sales: [
      {
        id: "PHB-2026-001",
        billDate: today,
        uhid: "GH-2026-1002",
        patientName: "Lakshmi Narayanan",
        saleType: "Prescription",
        items: [{ medId: "MED-001", medName: "Paracetamol 650mg Tab (Dolo)", batchNo: "DL2609", qty: 2, mrp: 34, gstPercent: 12, amount: 68 }],
        subTotal: 60.71,
        gstAmount: 7.29,
        discount: 0,
        netTotal: 68,
        paymentMode: "UPI",
        status: "Paid",
        billedBy: "staff123"
      }
    ],
    lab_tests: [
      { id: "LT-01", category: "Bloodtest", code: "CBC", name: "Complete Blood Count (CBC)", unit: "cells/mcL", normalRange: "4,500 - 11,000", price: 350, tatHours: 4 },
      { id: "LT-02", category: "Bloodtest", code: "FBS", name: "Fasting Blood Sugar", unit: "mg/dL", normalRange: "70 - 100", price: 150, tatHours: 2 },
      { id: "LT-03", category: "XRay Type", code: "CXR", name: "Chest X-Ray PA View", unit: "Report", normalRange: "Clear Lung Fields", price: 500, tatHours: 3 },
      { id: "LT-04", category: "Scan Type", code: "USG-ABD", name: "Ultrasound Whole Abdomen", unit: "Report", normalRange: "Normal Study", price: 1400, tatHours: 6 },
      { id: "LT-05", category: "Other Test", code: "ECG", name: "12-Lead Digital ECG", unit: "Tracing", normalRange: "Normal Sinus Rhythm", price: 300, tatHours: 1 },
      { id: "LT-06", category: "Physiotherapy", code: "PT-ASSESS", name: "Ortho Range of Motion Assessment", unit: "Score", normalRange: "0-100", price: 450, tatHours: 2 },
      { id: "LT-07", category: "Ophthalmology", code: "REFRACT", name: "Auto-Refractometry & IOP Check", unit: "mmHg", normalRange: "10 - 21", price: 400, tatHours: 1 }
    ],
    lab_orders: [
      {
        id: "LAB-2026-01",
        orderDate: today,
        uhid: "GH-2026-1001",
        patientName: "Aravind Swaminathan",
        category: "Bloodtest",
        testName: "Complete Blood Count (CBC)",
        source: "In-House",
        price: 350,
        resultValue: "",
        unit: "cells/mcL",
        normalRange: "4,500 - 11,000",
        status: "Pending",
        tatTargetHours: 4
      }
    ],
    cashier_bills: [
      {
        id: "INV-2026-001",
        billDate: today,
        uhid: "GH-2026-1001",
        patientName: "Aravind Swaminathan",
        doctorName: "Dr. S. Karthikeyan (MD)",
        department: "OP Consultation",
        items: [{ desc: "OP Consultation - Dr. S. Karthikeyan", qty: 1, rate: 400, amount: 400 }],
        grossAmount: 400,
        discount: 0,
        netAmount: 400,
        paidAmount: 400,
        paymentMode: "Cash",
        status: "Paid",
        billedBy: "staff123"
      },
      {
        id: "INV-2026-002",
        billDate: today,
        uhid: "GH-2026-1001",
        patientName: "Aravind Swaminathan",
        doctorName: "Dr. S. Karthikeyan (MD)",
        department: "Diagnostics",
        items: [{ desc: "Complete Blood Count (CBC)", qty: 1, rate: 350, amount: 350 }],
        grossAmount: 350,
        discount: 0,
        netAmount: 350,
        paidAmount: 0,
        paymentMode: "Pending",
        status: "Pending",
        billedBy: "staff123"
      }
    ],
    accounts: [
      { id: "ACC-1001", code: "1001", name: "Main Cash Drawer", group: "Asset", balance: 15000 },
      { id: "ACC-1002", code: "1002", name: "HDFC Hospital Current A/C", group: "Bank", balance: 185000 },
      { id: "ACC-5001", code: "5001", name: "Generator Diesel & Utilities", group: "Expense", balance: 4200 },
      { id: "ACC-5002", code: "5002", name: "Housekeeping & Biomedical Waste", group: "Expense", balance: 3500 }
    ],
    equipments: [
      { id: "EQ-01", name: "Mindray BC-5000 Hematology Analyzer", dept: "Lab", serialNo: "MN-88210", amcDue: "2027-03-31", calibrationDue: "2027-01-15", status: "Operational" },
      { id: "EQ-02", name: "Philips IntelliVue Patient Monitor", dept: "ICU", serialNo: "PH-99201", amcDue: "2027-06-30", calibrationDue: "2027-02-10", status: "Operational" }
    ],
    store_items: [
      { id: "ST-01", name: "Surgical Gloves (Box of 100)", category: "Consumables", unit: "Box", stock: 45, minLevel: 10 },
      { id: "ST-02", name: "N95 Masks (Pack of 20)", category: "PPE", unit: "Pack", stock: 30, minLevel: 10 },
      { id: "ST-03", name: "A4 Printing Paper Ream", category: "Stationery", unit: "Ream", stock: 22, minLevel: 5 }
    ],
    ambulances: [
      { id: "AMB-01", regNo: "TN-01-G-1080", type: "ALS ICU Cardiac", driver: "Senthil Kumar", phone: "9840100108", status: "Available" },
      { id: "AMB-02", regNo: "TN-01-G-1081", type: "BLS Oxygen Van", driver: "Murugan R", phone: "9840100109", status: "Available" }
    ],
    masters: [
      { id: "M-DOC-1", catalog: "Service Providers", code: "DOC01", name: "Dr. S. Karthikeyan (MD)", details: "General Medicine | Fee: ₹400 | Share: 70%" },
      { id: "M-DOC-2", catalog: "Service Providers", code: "DOC02", name: "Dr. R. Meenakshi (DGO)", details: "Obstetrics & Gynecology | Fee: ₹500 | Share: 70%" },
      { id: "M-DOC-3", catalog: "Service Providers", code: "DOC03", name: "Dr. K. Ramesh (MS Ortho)", details: "Orthopedics | Fee: ₹500 | Share: 70%" },
      { id: "M-SUP-1", catalog: "Supplier", code: "SUP01", name: "Apollo MedSupply Distributors", details: "GSTIN: 33AABCA1111F1Z2 | Chennai" },
      { id: "M-SUP-2", catalog: "Supplier", code: "SUP02", name: "MedPlus Pharma Wholesale", details: "GSTIN: 33AABCM2222G1Z8 | Madurai" },
      { id: "M-ICD-1", catalog: "ICD Code", code: "J06.9", name: "Acute Upper Respiratory Infection", details: "General Medicine" },
      { id: "M-ICD-2", catalog: "ICD Code", code: "E11.9", name: "Type 2 Diabetes Mellitus without complications", details: "Endocrinology" },
      { id: "M-INS-1", catalog: "Insurance", code: "STAR", name: "Star Health & Allied Insurance", details: "Cashless TPA Enabled" },
      { id: "M-SRV-1", catalog: "Services", code: "SRV-OP", name: "OP Consultation", details: "400" },
      { id: "M-SRV-2", catalog: "Services", code: "SRV-ECG", name: "ECG Monitoring", details: "300" }
    ]
  };
}
