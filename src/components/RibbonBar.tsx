import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ErpModuleId } from "../store/types";
import {
  LayoutDashboard,
  FlaskConical,
  Receipt,
  CalendarCheck,
  AlertTriangle,
  FileText,
  PieChart,
  Layers,
  Percent,
  AlertCircle,
  XCircle,
  Banknote,
  Lock,
  History,
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Search,
  Pill,
  DollarSign,
  Users,
  Bed,
  BarChart2,
  LineChart,
  Activity,
  UserCheck,
  Clipboard,
  BarChart,
  Globe,
  Calculator,
  Trash2,
  BookOpen,
  Scissors,
  Calendar,
  CheckCircle2,
  HeartPulse,
  ExternalLink,
  Shield,
  Baby,
  Syringe,
  FileCheck,
  Award,
  FileMinus,
  CheckSquare,
  ShieldAlert,
  ListOrdered,
  Wrench,
  ClipboardCheck,
  LogOut,
  Upload,
  FolderArchive,
  UserPlus,
  Key,
  Building,
  QrCode,
  RotateCcw,
  CheckCircle,
  GitMerge,
  Grid,
  ShoppingBag,
  Truck,
  FilePlus,
  RefreshCw,
  Edit,
  Landmark,
  Settings,
  Briefcase,
  ShoppingCart,
  Undo,
  PackagePlus,
  Edit3,
  CreditCard,
  Box,
  Building2,
  List,
  Folder,
  Navigation,
  Zap,
  Sparkles,
  Package,
  Image,
  User,
  Tv,
  Stethoscope,
  Network,
  ChevronDown,
  ChevronUp,
  Clock,
  Scan,
  Timer,
  Radio,
  ScanLine,
  TestTube,
  Eye,
  Droplets,
  Share2,
  UploadCloud,
} from "lucide-react";

export interface RibbonItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isDropdown?: boolean;
  dropdownOptions?: string[];
  tone?: "primary" | "warning" | "danger" | "success" | "neutral";
}

export interface RibbonGroup {
  groupTitle: string;
  items: RibbonItem[];
}

export interface RibbonTabConfig {
  id: ErpModuleId;
  label: string;
  badge?: string;
  icon: React.ElementType;
  groups: RibbonGroup[];
}

export const ERP_TABS_CONFIG: RibbonTabConfig[] = [
  // 1. Patient Module
  {
    id: "patient",
    label: "Patient",
    icon: User,
    groups: [
      {
        groupTitle: "Intake & Registration",
        items: [
          { id: "new_patient", label: "New Patient (UHID)", icon: UserPlus, tone: "primary" },
          { id: "opd_token", label: "Book OPD Token", icon: Calendar, tone: "success" },
          { id: "live_token_board", label: "Live OPD Token Board", icon: Tv, tone: "warning" },
        ],
      },
      {
        groupTitle: "Inpatient IPD Desk",
        items: [
          { id: "admit_patient", label: "Admit Inpatient (IPD)", icon: Bed, tone: "primary" },
          { id: "inpatient_beds", label: "Bed Ward Roster", icon: Layers },
          { id: "patient_directory", label: "Master Patients", icon: Users },
        ],
      },
      {
        groupTitle: "EHR & Verification",
        items: [
          { id: "visit_trail", label: "Visit Trail 360", icon: FileText },
          { id: "digital_card", label: "Smart ID Cards", icon: QrCode },
        ],
      },
    ],
  },

  // 2. Doctor Module
  {
    id: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    groups: [
      {
        groupTitle: "Clinical Workstation",
        items: [
          { id: "doctor_dashboard", label: "Doctor Queue", icon: LayoutDashboard, tone: "primary" },
          { id: "consultation", label: "Consultation & EHR", icon: Clipboard, tone: "success" },
          { id: "prescriptions", label: "E-Prescriptions", icon: Pill },
        ],
      },
      {
        groupTitle: "Orders & Inpatient",
        items: [
          { id: "order_lab", label: "Diagnostic Lab Order", icon: FlaskConical },
          { id: "doctor_rounds", label: "IPD Clinical Rounds", icon: Bed },
          { id: "medical_history", label: "Medical History", icon: History },
        ],
      },
    ],
  },

  // 3. Nurse Module
  {
    id: "nurse",
    label: "Nurse",
    icon: HeartPulse,
    groups: [
      {
        groupTitle: "Care Coordination",
        items: [
          { id: "nursing_station", label: "Nursing Terminal", icon: Bed, tone: "primary" },
          { id: "vitals_monitor", label: "Hourly Vitals Check", icon: HeartPulse, tone: "danger" },
          { id: "med_admin", label: "Medication Admin (MAR)", icon: Syringe, tone: "warning" },
        ],
      },
      {
        groupTitle: "Care Plans & Notes",
        items: [
          { id: "care_plans", label: "Nursing Care Plans", icon: ClipboardCheck },
          { id: "shift_handover", label: "Shift Handover Log", icon: History },
        ],
      },
    ],
  },

  // 4. Lab Module
  {
    id: "lab",
    label: "Lab",
    icon: FlaskConical,
    groups: [
      {
        groupTitle: "Operational Tools",
        items: [
          { id: "lab_dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "external_diag", label: "External Diagnostics", icon: Share2 },
          { id: "diagnostics", label: "Diagnostics", icon: FlaskConical, tone: "primary" },
          { id: "pending_test", label: "Pending Test", icon: Clock, tone: "warning" },
          { id: "edit_diag", label: "Edit Diagnostics", icon: Edit3 },
          { id: "external_lab", label: "External Lab", icon: Building2 },
          { id: "ext_pending", label: "Ext. Pending Tests", icon: AlertCircle },
          { id: "auto_uploads", label: "Auto Uploaded Results", icon: UploadCloud, tone: "success" },
        ],
      },
      {
        groupTitle: "Lab Analytics",
        items: [
          { id: "lab_eod", label: "Lab EOD Report", icon: FileSpreadsheet },
          { id: "ext_lab_report", label: "External Lab Report", icon: FileText },
          { id: "scan_diag_report", label: "Scan Diagnosis Report", icon: Scan },
          { id: "tat_report", label: "TAT Report", icon: Timer },
        ],
      },
      {
        groupTitle: "Stock",
        items: [
          { id: "stock_purchase", label: "Stock Purchase", icon: ShoppingCart },
          {
            id: "purchase_order",
            label: "Purchase Order",
            icon: FilePlus,
            isDropdown: true,
            dropdownOptions: ["New PO", "Pending POs", "Approved POs", "PO Register"],
          },
          {
            id: "lab_report_drop",
            label: "Lab Report",
            icon: BarChart2,
            isDropdown: true,
            dropdownOptions: ["Reagent Consumption", "Quality Control (QC) Log", "Reagent Expiry Register"],
          },
          {
            id: "inventory_update",
            label: "Inventory Update",
            icon: RefreshCw,
            isDropdown: true,
            dropdownOptions: ["Stock Adjustments", "Batch Reconciliation", "Physical Audit"],
          },
          { id: "pending_payments", label: "Pending Payments", icon: CreditCard, tone: "danger" },
        ],
      },
      {
        groupTitle: "Maintenance",
        items: [
          {
            id: "lab_inventory",
            label: "Lab Inventory",
            icon: Wrench,
            isDropdown: true,
            dropdownOptions: ["Analyzer Calibration", "Centrifuge Maintenance", "AMC Service Contracts"],
          },
        ],
      },
      {
        groupTitle: "Test Maintenance",
        items: [
          { id: "bloodtest", label: "Bloodtest", icon: Droplets },
          { id: "xray_type", label: "XRay Type", icon: Radio },
          { id: "scan_type", label: "Scan Type", icon: ScanLine },
          { id: "other_test", label: "Other Test", icon: TestTube },
          { id: "physiotherapy_test", label: "Physiotherapy", icon: Activity },
          { id: "ophthalmology", label: "Ophthalmology", icon: Eye },
        ],
      },
    ],
  },

  // 5. Pharmacy Module
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    groups: [
      {
        groupTitle: "Pharmacy Sales & Dispensing",
        items: [
          { id: "pharmacy_billing", label: "Dispensing & Billing", icon: Receipt, tone: "primary" },
          { id: "pharmacy_invoices", label: "All Invoices", icon: FileText },
          { id: "sales_returns", label: "Sales Returns", icon: Undo },
        ],
      },
      {
        groupTitle: "Stock & Formulary",
        items: [
          { id: "pharmacy_inventory", label: "Pharmacy Stock", icon: Pill },
          { id: "grn_entry", label: "GRN Entry", icon: ShoppingCart },
          { id: "grn_approvals", label: "GRN Approvals", icon: CheckSquare },
          { id: "narcotic_log", label: "Narcotic Register", icon: AlertTriangle, tone: "danger" },
          { id: "expiry_tracker", label: "Expiry Tracker", icon: CalendarCheck, tone: "warning" },
        ],
      },
    ],
  },

  // 6. Cashier Module
  {
    id: "cashier",
    label: "Cashier",
    icon: Receipt,
    groups: [
      {
        groupTitle: "Operational Tools",
        items: [
          { id: "cashier_dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "pending_dashboard", label: "Pending Dashboard", icon: Clock, tone: "warning" },
          { id: "cashier_diagnostics", label: "Diagnostics", icon: FlaskConical },
          { id: "prebooking", label: "PreBooking", icon: CalendarCheck, tone: "primary" },
          { id: "emergency_count", label: "Emergency Count", icon: AlertTriangle, tone: "danger" },
        ],
      },
      {
        groupTitle: "Billing and Collection Reports",
        items: [
          {
            id: "eod_report",
            label: "EOD Report",
            icon: FileSpreadsheet,
            isDropdown: true,
            dropdownOptions: ["Shift EOD Report", "Day Final EOD", "Cashier Shift Summary"],
          },
          { id: "daily_report", label: "Daily Report", icon: FileText },
          { id: "collection_summary", label: "Collection Summary", icon: PieChart },
          { id: "consolidated_payment", label: "Consolidated Payment Report", icon: Layers },
          { id: "discount_report", label: "Discount Report", icon: Percent },
          { id: "pending_payment_rep", label: "Pending Payment Report", icon: AlertCircle, tone: "danger" },
          {
            id: "patient_reports",
            label: "Patient Reports",
            icon: Users,
            isDropdown: true,
            dropdownOptions: ["Patient Financial Ledger", "Discharge Settlement Slip", "Advance Refund Voucher"],
          },
          {
            id: "doctor_collection",
            label: "Doctor Collection",
            icon: Stethoscope,
            isDropdown: true,
            dropdownOptions: ["Consultation Revenue Share", "Surgeon OT Fee Report", "Doctor Payout Summary"],
          },
          { id: "uncleared_payments", label: "Uncleared Payments", icon: XCircle, tone: "danger" },
        ],
      },
      {
        groupTitle: "Payments",
        items: [{ id: "payments_entry", label: "Payments", icon: Banknote, tone: "success" }],
      },
      {
        groupTitle: "Tally",
        items: [
          {
            id: "tally_report",
            label: "Tally Report",
            icon: Landmark,
            isDropdown: true,
            dropdownOptions: ["Export to Tally XML", "Tally Daybook Export", "Chart of Accounts Mapping"],
          },
        ],
      },
    ],
  },

  // 7. Maintenance Module
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    groups: [
      {
        groupTitle: "Facility & Engineering",
        items: [
          { id: "facility_overview", label: "Facility Overview", icon: Building2 },
          { id: "work_orders", label: "Work Orders", icon: Wrench, tone: "primary" },
          { id: "breakdown_tickets", label: "Breakdown Tickets", icon: AlertTriangle, tone: "danger" },
          { id: "amc_contracts", label: "AMC Contracts", icon: ShieldCheck },
        ],
      },
    ],
  },

  // 8. Accounts Module
  {
    id: "accounts",
    label: "Accounts",
    icon: Landmark,
    groups: [
      {
        groupTitle: "Cash Close",
        items: [
          { id: "final_cash_close", label: "Final Cash Close", icon: Lock, tone: "danger" },
          { id: "final_cash_close_log", label: "Final Cash Close Log", icon: History },
        ],
      },
      {
        groupTitle: "Accounts",
        items: [
          { id: "add_accounts", label: "Add Accounts", icon: PlusCircle, tone: "primary" },
          { id: "pending_expense", label: "Pending Expense", icon: Clock, tone: "warning" },
          { id: "add_expenses", label: "Add Expenses", icon: ArrowDownCircle },
          { id: "add_receivable", label: "Add Receivable", icon: ArrowUpCircle, tone: "success" },
        ],
      },
      {
        groupTitle: "Reports",
        items: [
          { id: "transaction_report", label: "Transaction Report", icon: FileSpreadsheet },
          { id: "expenses_report", label: "Expenses Report", icon: TrendingDown },
          { id: "receivables_report", label: "Receivables Report", icon: TrendingUp },
          { id: "accounts_audit", label: "Accounts Audit", icon: ShieldCheck },
        ],
      },
      {
        groupTitle: "Bill Search",
        items: [
          { id: "cashier_bill_search", label: "Cashier Bill Search", icon: Search },
          { id: "pharmacy_bill_search", label: "Pharmacy Bill Search", icon: Pill },
        ],
      },
      {
        groupTitle: "Credit Report",
        items: [
          { id: "credit_pending_rep", label: "Credit Pending Report", icon: AlertCircle, tone: "warning" },
          { id: "doctor_income_pay", label: "Doctor Income Payment", icon: DollarSign, tone: "success" },
          { id: "doctor_income_rep", label: "Doctor Income Payment Report", icon: FileText },
        ],
      },
    ],
  },

  // 9. Reports Module
  {
    id: "reports",
    label: "Reports",
    icon: BarChart2,
    groups: [
      {
        groupTitle: "Clinical & Patient Analytics",
        items: [
          { id: "visit_details", label: "Visit Details", icon: Users },
          { id: "ip_log_report", label: "IP Log Report", icon: Bed },
          { id: "diagnostics_chart", label: "Diagnostics Chart", icon: BarChart2 },
          { id: "patient_analysis", label: "Patient Analysis", icon: LineChart },
          { id: "illness_report", label: "Illness Report", icon: Activity },
          { id: "patient_by_illness", label: "Patient By Illness", icon: UserCheck },
          { id: "diagnosis_report", label: "Diagnosis Report", icon: Clipboard },
          { id: "patient_statistics", label: "Patient Statistics", icon: BarChart },
          { id: "icd_report", label: "ICD Report", icon: Globe },
        ],
      },
      {
        groupTitle: "Financial & Revenue Analytics",
        items: [
          { id: "eod_report_central", label: "EOD Report", icon: FileText },
          { id: "lab_eod_central", label: "Lab EOD Report", icon: FlaskConical },
          { id: "tds_report", label: "TDS", icon: Calculator },
          { id: "patient_pay_history", label: "Patient Payment History", icon: History },
          { id: "deleted_charges", label: "Deleted Charges/Payment", icon: Trash2, tone: "danger" },
          { id: "cash_close_central", label: "Cash Close Log Report", icon: Lock },
        ],
      },
      {
        groupTitle: "Operational & Registry Logs",
        items: [
          { id: "patient_register_rep", label: "Patient Register Report", icon: BookOpen },
          { id: "surgery_report", label: "Surgery Report", icon: Scissors },
          { id: "prebooking_rep", label: "PreBooking Report", icon: Calendar },
          { id: "review_appt_report", label: "Review/Appt Report", icon: CheckCircle2 },
          { id: "iud_report", label: "IUD Report", icon: HeartPulse },
          { id: "ext_lab_central", label: "External Lab Report", icon: ExternalLink },
          {
            id: "ce_reports",
            label: "CE Reports",
            icon: Award,
            isDropdown: true,
            dropdownOptions: ["Clinical Excellence Audit", "Infection Control Stats", "Morbidity & Mortality (M&M)"],
          },
          { id: "audit_report", label: "Audit Report", icon: Shield },
        ],
      },
    ],
  },

  // 10. Certificate Module
  {
    id: "certificate",
    label: "Certificate",
    icon: Award,
    groups: [
      {
        groupTitle: "Medical & Vital Certificates",
        items: [
          { id: "birth_cert", label: "Birth Certificate", icon: Baby, tone: "primary" },
          { id: "vaccination_cert", label: "Vaccination Certificate", icon: Syringe, tone: "success" },
          { id: "medical_cert", label: "Medical Certificate", icon: FileCheck },
          { id: "fitness_cert", label: "Fitness Certificate", icon: Award },
          { id: "death_cert", label: "Death Certificate", icon: FileMinus, tone: "danger" },
        ],
      },
      {
        groupTitle: "Consents & Declarations",
        items: [
          { id: "self_declaration", label: "Self Declaration", icon: FileText },
          {
            id: "marine_cert",
            label: "Marine",
            icon: Navigation,
            isDropdown: true,
            dropdownOptions: ["ILO Seafarer Fitness", "DG Shipping Deck Cert", "Maritime Vision Test"],
          },
          { id: "consent_form", label: "Consent Form", icon: CheckSquare },
          { id: "surgical_consent", label: "Surgical Consent Form", icon: ShieldAlert, tone: "warning" },
        ],
      },
      {
        groupTitle: "Registry",
        items: [{ id: "cert_report", label: "Certificate Report", icon: ListOrdered }],
      },
    ],
  },

  // 11. Equipments Module
  {
    id: "equipments",
    label: "Equipments",
    icon: Box,
    groups: [
      {
        groupTitle: "Overview",
        items: [{ id: "equip_dashboard", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        groupTitle: "Maintenance",
        items: [
          { id: "equipments_list", label: "Equipments", icon: Wrench, tone: "primary" },
          { id: "daily_worksheet", label: "Daily Worksheet", icon: ClipboardCheck, tone: "success" },
        ],
      },
      {
        groupTitle: "Report",
        items: [
          { id: "service_report", label: "Service Report", icon: FileSpreadsheet },
          { id: "worksheet_report", label: "Worksheet Report", icon: FileText },
        ],
      },
      {
        groupTitle: "Gate Pass",
        items: [
          { id: "gate_pass_mgmt", label: "Gate Pass Management", icon: LogOut, tone: "warning" },
          { id: "gate_pass_report", label: "Gate Pass Report", icon: History },
        ],
      },
      {
        groupTitle: "Document",
        items: [
          { id: "document_upload", label: "Document Upload", icon: Upload },
          { id: "documents_report", label: "Documents Report", icon: FolderArchive },
        ],
      },
    ],
  },

  // 12. Admin Module
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    groups: [
      {
        groupTitle: "User Access",
        items: [
          { id: "create_user", label: "Create User", icon: UserPlus, tone: "primary" },
          { id: "reset_password", label: "Reset Password", icon: Key },
          { id: "user_role_mgmt", label: "User Role Management", icon: Shield },
          { id: "doctors_calendar", label: "Doctors Calendar", icon: Calendar },
        ],
      },
      {
        groupTitle: "Hospital Operations",
        items: [
          { id: "facility_mgmt", label: "Facility Management", icon: Building },
          { id: "id_card_forward", label: "ID Card Forward", icon: QrCode },
          { id: "cancel_ip_discharge", label: "Cancel IP Discharge", icon: RotateCcw, tone: "danger" },
        ],
      },
      {
        groupTitle: "Operation",
        items: [
          { id: "allotment", label: "Allotment", icon: CheckSquare },
          {
            id: "operation_maintenance",
            label: "Maintenance",
            icon: Wrench,
            isDropdown: true,
            dropdownOptions: ["Civil Engineering", "HVAC & Chiller Maintenance", "Generator & UPS Checks", "Biomedical Waste Log"],
          },
        ],
      },
      {
        groupTitle: "Employee HR / Payroll",
        items: [
          { id: "new_employee", label: "New Employee", icon: UserCheck, tone: "success" },
          { id: "view_employees", label: "View Employees", icon: Users },
          { id: "attendance", label: "Attendance", icon: Clock },
          {
            id: "employee_drop",
            label: "Employee",
            icon: Briefcase,
            isDropdown: true,
            dropdownOptions: ["Duty Roster", "Leave Approvals", "Performance Reviews"],
          },
          { id: "payroll_generation", label: "Payroll Generation", icon: Banknote, tone: "primary" },
        ],
      },
      {
        groupTitle: "System Utilities",
        items: [
          { id: "acquittance", label: "Acquittance", icon: CheckCircle },
          { id: "merge_phn", label: "Merge PHN", icon: GitMerge, tone: "warning" },
          { id: "menu_mapping", label: "User Role Menu Mapping", icon: Grid },
        ],
      },
    ],
  },

  // 13. Physiotherapy Module
  {
    id: "physiotherapy",
    label: "Physiotherapy",
    icon: Activity,
    groups: [
      {
        groupTitle: "Sales",
        items: [
          { id: "physio_sales", label: "General Sales", icon: ShoppingBag, tone: "primary" },
          { id: "physio_sale_return", label: "Sale Return", icon: RotateCcw },
        ],
      },
      {
        groupTitle: "Purchase",
        items: [
          { id: "physio_purchase_stock", label: "Purchase Stock", icon: Truck },
          { id: "physio_purchase_order", label: "Purchase Order", icon: FilePlus },
          { id: "physio_stock_update", label: "Stock Update", icon: RefreshCw },
          { id: "physio_purchase_update", label: "Purchase Update", icon: Edit },
        ],
      },
      {
        groupTitle: "Report",
        items: [
          { id: "physio_eod", label: "EOD Report", icon: FileText },
          { id: "physio_sales_by_bill", label: "Sales By Bill", icon: Receipt },
          { id: "physio_stock_avail", label: "Stock Availability", icon: Layers },
          { id: "physio_purchase_report", label: "Purchase Report", icon: FileSpreadsheet },
          { id: "physio_inhouse_eod", label: "InHouse EOD", icon: Landmark },
        ],
      },
      {
        groupTitle: "Maintenance",
        items: [
          { id: "physio_item_master", label: "Physiotherapy Item Master", icon: Settings },
          { id: "physio_vendor_master", label: "Vendor Master", icon: Briefcase },
        ],
      },
    ],
  },

  // 14. Store Module
  {
    id: "store",
    label: "Store",
    icon: Package,
    groups: [
      {
        groupTitle: "Sales",
        items: [
          { id: "store_sales", label: "Store Sales", icon: ShoppingCart, tone: "primary" },
          { id: "store_sales_return", label: "Sales Return", icon: Undo },
        ],
      },
      {
        groupTitle: "Stock",
        items: [
          { id: "store_purchase_stock", label: "Purchase Stock", icon: PackagePlus },
          { id: "store_purchase_order", label: "Purchase Order", icon: FileText },
          { id: "store_purchase_update", label: "Purchase Update", icon: RefreshCw },
          { id: "store_stock_update", label: "Stock Update", icon: Edit3 },
          { id: "store_pending_payment", label: "Pending Payment", icon: CreditCard, tone: "danger" },
        ],
      },
      {
        groupTitle: "Report",
        items: [
          { id: "store_inhouse_eod", label: "InHouse EOD", icon: Building },
          { id: "store_eod", label: "EOD Report", icon: FileSpreadsheet },
          { id: "store_sales_by_bill", label: "Sales By Bill", icon: Receipt },
          { id: "store_stock_avail", label: "Stock Availability", icon: Box },
          { id: "store_purchase_report", label: "Purchase Report", icon: ShoppingBag },
          { id: "store_payment_report", label: "Payment Report", icon: CheckCircle },
          { id: "store_stock_by_supplier", label: "Stock By Supplier", icon: Users },
        ],
      },
      {
        groupTitle: "Maintenance",
        items: [
          { id: "store_vendor_master", label: "Vendor Master", icon: Building2 },
          { id: "store_item_master", label: "Item Master", icon: List },
        ],
      },
      {
        groupTitle: "Document",
        items: [
          { id: "store_document", label: "Store Document", icon: Upload },
          { id: "store_view_documents", label: "View Store Documents", icon: Folder },
        ],
      },
    ],
  },

  // 15. Ambulance Module
  {
    id: "ambulance",
    label: "Ambulance",
    icon: Navigation,
    groups: [
      {
        groupTitle: "Emergency Fleet Operations",
        items: [
          { id: "amb_allotment", label: "Ambulance Allotment", icon: Navigation, tone: "danger" },
          { id: "amb_maintenance", label: "Ambulance Maintenance", icon: Wrench, tone: "warning" },
          { id: "amb_services", label: "Ambulance Services", icon: Activity, tone: "primary" },
        ],
      },
    ],
  },

  // 16. Skin Module
  {
    id: "skin",
    label: "Skin",
    icon: Sparkles,
    groups: [
      {
        groupTitle: "Dermatology & Cosmetology",
        items: [
          { id: "skin_consultation", label: "Skin Consultations", icon: User, tone: "primary" },
          { id: "skin_procedures", label: "Procedures & Laser", icon: Zap, tone: "warning" },
          { id: "skin_regimens", label: "Treatment Regimens", icon: Sparkles },
          { id: "skin_products", label: "Skin Care Products", icon: Package },
          { id: "skin_records", label: "Patient Skin Records", icon: Image },
        ],
      },
    ],
  },

  // 17. Dashboard Module
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    groups: [
      {
        groupTitle: "Executive Command Center",
        items: [
          { id: "dash_overview", label: "Hospital Overview", icon: LayoutDashboard, tone: "primary" },
          { id: "dash_multibranch", label: "Multi-Branch Matrix", icon: Network },
          { id: "dash_occupancy", label: "Bed Occupancy", icon: Bed },
          { id: "dash_revenue", label: "Revenue Analytics", icon: TrendingUp, tone: "success" },
        ],
      },
    ],
  },
];

interface DropdownMenuState {
  item: RibbonItem;
  top: number;
  left: number;
}

export const RibbonBar: React.FC<{
  activeModule: ErpModuleId;
  setActiveModule: (m: ErpModuleId) => void;
  activeAction?: string;
  onActionClick: (moduleId: ErpModuleId, actionId: string, dropdownValue?: string) => void;
  isRibbonCollapsed: boolean;
  setIsRibbonCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  allowedModuleIds?: ErpModuleId[];
}> = ({
  activeModule,
  setActiveModule,
  activeAction,
  onActionClick,
  isRibbonCollapsed,
  setIsRibbonCollapsed,
  allowedModuleIds,
}) => {
  const [openDropdown, setOpenDropdown] = useState<DropdownMenuState | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);

  const visibleTabs = allowedModuleIds
    ? ERP_TABS_CONFIG.filter((t) => allowedModuleIds.includes(t.id))
    : ERP_TABS_CONFIG;

  const activeTabConfig =
    visibleTabs.find((t) => t.id === activeModule) ||
    ERP_TABS_CONFIG.find((t) => t.id === activeModule) ||
    visibleTabs[0] ||
    ERP_TABS_CONFIG[0];

  // Close dropdown on outside click, escape, or scroll
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        portalMenuRef.current?.contains(target) ||
        ribbonRef.current?.contains(target)
      ) {
        return;
      }
      setOpenDropdown(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    const handleResize = () => setOpenDropdown(null);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleDropdown = (item: RibbonItem, buttonEl: HTMLButtonElement) => {
    if (openDropdown?.item.id === item.id) {
      setOpenDropdown(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 232;
    const clampedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    const top = Math.min(rect.bottom + 4, window.innerHeight - 180);
    setOpenDropdown({ item, top, left: clampedLeft });
  };

  return (
    <div ref={ribbonRef} className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 transition-all select-none">
      {/* ── Top Level Module Tabs (Horizontal scroll on smaller viewports) ── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 px-2 lg:px-4 bg-slate-100/70 dark:bg-slate-950/50">
        <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth space-x-1 py-1 min-w-0">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeModule;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveModule(tab.id);
                  setOpenDropdown(null);
                  if (isRibbonCollapsed) {
                    setIsRibbonCollapsed(false);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border-sky-600 dark:border-sky-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50"
                }`}
                title={`${tab.label} Module`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Ribbon Collapse Toggle */}
        <button
          onClick={() => {
            setOpenDropdown(null);
            setIsRibbonCollapsed((prev) => !prev);
          }}
          className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition ml-2 shrink-0"
          title={isRibbonCollapsed ? "Expand Ribbon Tools" : "Collapse Ribbon Tools"}
          aria-label={isRibbonCollapsed ? "Expand Ribbon Tools" : "Collapse Ribbon Tools"}
        >
          {isRibbonCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* ── The Ribbon Action Bar (Categorized Action Groups) ── */}
      {!isRibbonCollapsed && (
        <div
          onScroll={() => setOpenDropdown(null)}
          className="px-2 sm:px-3 py-2 overflow-x-auto flex items-stretch gap-2 sm:gap-2.5 min-h-[72px] bg-white dark:bg-slate-900 transition-all text-xs"
        >
          {activeTabConfig.groups.map((group, gIdx) => (
            <div
              key={`${activeTabConfig.id}_g_${gIdx}`}
              className="flex flex-col justify-between p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 shrink-0 min-w-fit"
            >
              {/* Group Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap max-w-[92vw] sm:max-w-none">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = activeAction === item.id;
                  const isDropdownOpen = openDropdown?.item.id === item.id;

                  if (item.isDropdown && item.dropdownOptions) {
                    return (
                      <div key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={(e) => toggleDropdown(item, e.currentTarget)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                            isItemActive || isDropdownOpen
                              ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                          }`}
                        >
                          <ItemIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span>{item.label}</span>
                          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onActionClick(activeTabConfig.id, item.id);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                        isItemActive
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : item.tone === "primary"
                          ? "bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                          : item.tone === "success"
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : item.tone === "warning"
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : item.tone === "danger"
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          : "bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                      }`}
                      title={item.label}
                    >
                      <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Group Category Caption at Bottom */}
              <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400 dark:text-slate-500 text-center mt-1 pt-0.5 border-t border-slate-200/50 dark:border-slate-800/50">
                {group.groupTitle}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portal-rendered dropdown menu so overflow-x-auto never clips dropdown items */}
      {openDropdown &&
        createPortal(
          <div
            ref={portalMenuRef}
            style={{ top: openDropdown.top, left: openDropdown.left }}
            className="fixed w-58 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1 z-[100] text-xs"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {openDropdown.item.label} Actions
            </div>
            {(openDropdown.item.dropdownOptions || []).map((opt, oIdx) => (
              <button
                key={oIdx}
                type="button"
                onClick={() => {
                  onActionClick(activeTabConfig.id, openDropdown.item.id, opt);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-900/40 hover:text-sky-600 dark:hover:text-sky-300 transition flex items-center justify-between"
              >
                <span>{opt}</span>
                <span className="text-[10px] text-slate-400">→</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default RibbonBar;
