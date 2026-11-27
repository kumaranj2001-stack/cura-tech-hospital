/**
 * Complete Multi-Departmental Ribbon Definition for Guru Hospital (Nalam+ ERP)
 * Matches all 16 departmental tabs + far-left glossy blue App button,
 * including every section, large button, stacked column, and dropdown menu.
 */

export const RIBBON_TABS = [
  { id: "app_home", label: "Facility Hub", isAppButton: true, perm: "app_home" },
  { id: "nalam", label: "Nalam+", perm: "nalam" },
  { id: "patient", label: "Patient", perm: "patient" },
  { id: "doctor", label: "Doctor", perm: "doctor" },
  { id: "lab", label: "Lab", perm: "lab" },
  { id: "pharmacy", label: "Pharmacy", perm: "pharmacy" },
  { id: "cashier", label: "Cashier", perm: "cashier" },
  { id: "maintenance", label: "Maintenance", perm: "maintenance" },
  { id: "accounts", label: "Accounts", perm: "accounts" },
  { id: "reports", label: "Reports", perm: "reports" },
  { id: "certificate", label: "Certificate", perm: "certificate" },
  { id: "equipments", label: "Equipments", perm: "equipments" },
  { id: "admin", label: "Admin", perm: "admin" },
  { id: "physiotherapy", label: "Physiotherapy", perm: "physiotherapy" },
  { id: "store", label: "Store", perm: "store" },
  { id: "ambulance", label: "Ambulance", perm: "ambulance" },
  { id: "skin", label: "Skin", perm: "skin" }
];

const btn = (label, viewId, icon = "doc", tone = "blue", params = {}, perm = null) => ({
  type: "button", label, viewId, icon, tone, params, perm
});

const dd = (label, icon, tone, items, perm = null) => ({
  type: "dropdown", label, icon, tone, items, perm
});

export const RIBBON_CONFIG = {
  app_home: [
    {
      label: "",
      items: [
        { kind: "large", ...btn("Dashboard", "exec_dashboard", "dashboard", "green") }
      ]
    },
    {
      label: "Maintenance",
      items: [
        { kind: "large", ...btn("Equipments", "equip_registry", "gear", "blue") },
        { kind: "large", ...btn("Daily Worksheet", "daily_worksheet", "doc", "teal") }
      ]
    },
    {
      label: "Report",
      items: [
        { kind: "large", ...btn("Service Report", "service_report", "report", "blue") },
        { kind: "large", ...btn("Worksheet Report", "worksheet_report", "report", "teal") }
      ]
    },
    {
      label: "Gate Pass",
      items: [
        { kind: "large", ...btn("Gate Pass Management", "gate_pass_mgmt", "cert", "amber") },
        { kind: "large", ...btn("Gate Pass Report", "gate_pass_report", "report", "amber") }
      ]
    },
    {
      label: "Document",
      items: [
        { kind: "large", ...btn("Document Upload", "document_upload", "doc", "purple") },
        { kind: "large", ...btn("Documents Report", "documents_report", "report", "purple") }
      ]
    }
  ],

  nalam: [
    {
      label: "User & HR",
      items: [
        { kind: "large", ...btn("Log Off", "action_logoff", "lock", "red") },
        { kind: "large", ...btn("Change Password", "change_password", "gear", "blue") },
        { kind: "large", ...btn("Employee Leave Request", "employee_leave", "cert", "teal") }
      ]
    },
    {
      label: "About us",
      items: [
        { kind: "large", ...btn("Nalam+", "about_nalam", "dashboard", "blue") },
        { kind: "large", ...btn("Ask Nalam", "ask_nalam", "sms", "green") }
      ]
    }
  ],

  patient: [
    {
      label: "Registration",
      items: [
        { kind: "large", ...btn("New Patient", "patient_new", "user-add", "green") },
        { kind: "large", ...btn("Edit Patients", "patient_edit", "users", "blue") }
      ]
    },
    {
      label: "OP Reception",
      items: [
        { kind: "large", ...btn("Outpatient", "op_registration", "doctor", "blue") },
        {
          kind: "stack",
          rows: [
            btn("Token", "op_tokens", "cert", "green"),
            btn("Appointments", "op_appointments", "doc", "blue"),
            btn("Related Patients", "related_patients", "users", "teal")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Test Rx", "op_test_rx", "lab", "purple"),
            btn("Call Log", "patient_call_log", "sms", "amber")
          ]
        }
      ]
    },
    {
      label: "IP Reception",
      items: [
        { kind: "large", ...btn("Inpatient", "ip_admission", "bed", "blue") },
        { kind: "large", ...btn("Dashboard", "ip_bed_dashboard", "dashboard", "green") },
        {
          kind: "stack",
          rows: [
            btn("Diagnostics", "lab_orders", "lab", "blue"),
            btn("Test Enquiry", "test_enquiry", "doc", "teal"),
            dd("Room Management", "bed", "amber", [
              { label: "Wards & Room Categories", viewId: "room_management", params: { mode: "wards" } },
              { label: "Bed Allocation & Transfers", viewId: "room_management", params: { mode: "transfers" } },
              { label: "Housekeeping Availability", viewId: "room_management", params: { mode: "housekeeping" } }
            ])
          ]
        }
      ]
    },
    {
      label: "IP Services",
      items: [
        { kind: "large", ...btn("Service Log", "ip_service_log", "doc", "teal") },
        { kind: "large", ...btn("Discharge", "ip_discharge", "cert", "red") },
        {
          kind: "stack",
          rows: [
            btn("Edit Inpatient", "ip_edit", "bed", "blue"),
            btn("Misc Services", "ip_misc_services", "cash", "amber")
          ]
        }
      ]
    },
    {
      label: "Alerts",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Patients", "alerts_queue", "alert", "amber", { scope: "Patients" }),
            btn("Doctors", "alerts_queue", "alert", "blue", { scope: "Doctors" }),
            btn("Vaccination", "alerts_queue", "alert", "green", { scope: "Vaccination" })
          ]
        },
        { kind: "large", ...btn("Send SMS", "send_sms", "sms", "green") }
      ]
    },
    {
      label: "Roster",
      items: [
        {
          kind: "large",
          ...dd("Duty Allotment", "users", "purple", [
            { label: "Doctor Shift Schedule", viewId: "duty_allotment", params: { role: "Doctor" } },
            { label: "Nursing Shift Roster", viewId: "duty_allotment", params: { role: "Nurse" } },
            { label: "Duty Swap Log", viewId: "duty_allotment", params: { role: "Swap" } }
          ])
        }
      ]
    }
  ],

  doctor: [
    {
      label: "Outpatient",
      items: [
        { kind: "large", ...btn("OP Dashboard", "doc_op_dashboard", "doctor", "blue") },
        { kind: "large", ...btn("Prescreening", "doc_prescreening", "cert", "green") }
      ]
    },
    {
      label: "Inpatient",
      items: [
        { kind: "large", ...btn("IP Dashboard", "doc_ip_dashboard", "bed", "blue") },
        { kind: "large", ...btn("Daycare", "doc_daycare", "doctor", "teal") },
        { kind: "large", ...btn("Diet Management", "doc_diet", "doc", "amber") }
      ]
    },
    {
      label: "EMR",
      items: [
        { kind: "large", ...btn("Patient History", "doc_patient_history", "report", "purple") }
      ]
    },
    {
      label: "Clinical & OBG",
      items: [
        {
          kind: "stack",
          rows: [
            btn("EDD Report", "doc_edd_report", "report", "amber"),
            btn("Delivery Report", "doc_delivery_report", "cert", "green")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Sterilisation/IUD Acceptor", "doc_iud_report", "doc", "purple"),
            btn("Review/Appointment", "doc_review_appt", "users", "blue")
          ]
        }
      ]
    }
  ],

  lab: [
    {
      label: "Diagnostics",
      items: [
        { kind: "large", ...btn("Dashboard", "lab_dashboard", "dashboard", "green") },
        { kind: "large", ...btn("External Diagnostics", "lab_external_diag", "lab", "purple") },
        {
          kind: "stack",
          rows: [
            btn("Diagnostics", "lab_orders", "lab", "blue"),
            btn("Pending Test", "lab_pending", "alert", "amber"),
            btn("Edit Diagnostics", "lab_edit_results", "doc", "teal")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("External Lab", "lab_external_orders", "truck", "purple"),
            btn("Ext. Pending Tests", "lab_ext_pending", "alert", "amber"),
            btn("Auto Uploaded Results", "lab_auto_results", "gear", "green")
          ]
        }
      ]
    },
    {
      label: "Analytics",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Lab EOD Report", "lab_eod_report", "report", "blue"),
            btn("External Lab Report", "lab_ext_report", "report", "purple"),
            btn("Scan Diagnosis Report", "lab_scan_report", "report", "teal")
          ]
        },
        { kind: "large", ...btn("TAT Report", "lab_tat_report", "dashboard", "amber") }
      ]
    },
    {
      label: "Stock",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Stock Purchase", "lab_stock_purchase", "pharmacy", "green"),
            dd("Purchase Order", "doc", "blue", [
              { label: "New Lab Purchase Order", viewId: "lab_po_manage", params: { mode: "new" } },
              { label: "Lab PO Register", viewId: "lab_po_manage", params: { mode: "list" } }
            ]),
            dd("Lab Report", "report", "teal", [
              { label: "Reagent Consumption", viewId: "lab_stock_report", params: { type: "consumption" } },
              { label: "Lab Stock Valuation", viewId: "lab_stock_report", params: { type: "valuation" } }
            ])
          ]
        },
        {
          kind: "stack",
          rows: [
            dd("Inventory Update", "gear", "amber", [
              { label: "Manual Stock Adjustment", viewId: "lab_inventory_mgmt", params: { mode: "adjust" } },
              { label: "Opening Reagent Stock", viewId: "lab_inventory_mgmt", params: { mode: "opening" } }
            ], "manage_inventory_settings"),
            btn("Pending Payments", "lab_pending_payments", "cash", "red")
          ]
        }
      ]
    },
    {
      label: "Maintenance",
      items: [
        {
          kind: "large",
          ...dd("Lab Inventory", "gear", "teal", [
            { label: "Reagent Lot & Expiry Tracker", viewId: "lab_inventory_mgmt", params: { mode: "lots" } },
            { label: "Low Reagent Thresholds", viewId: "lab_inventory_mgmt", params: { mode: "thresholds" } }
          ], "manage_inventory_settings")
        }
      ]
    },
    {
      label: "Test Maintenance",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Bloodtest", "lab_test_catalog", "lab", "red", { category: "Bloodtest" }),
            btn("XRay Type", "lab_test_catalog", "doc", "blue", { category: "XRay Type" }),
            btn("Scan Type", "lab_test_catalog", "dashboard", "purple", { category: "Scan Type" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Other Test", "lab_test_catalog", "doc", "teal", { category: "Other Test" }),
            btn("Physiotherapy", "lab_test_catalog", "users", "green", { category: "Physiotherapy" }),
            btn("Ophthalmology", "lab_test_catalog", "cert", "amber", { category: "Ophthalmology" })
          ]
        }
      ]
    }
  ],

  pharmacy: [
    {
      label: "Sales",
      items: [
        { kind: "large", ...btn("Prescriptions", "pharma_rx_dispense", "pharmacy", "green") },
        { kind: "large", ...btn("General", "pharma_general_pos", "cash", "blue") },
        {
          kind: "stack",
          rows: [
            btn("Returns", "pharma_sales_returns", "alert", "amber"),
            btn("Pending Bills", "pharma_pending_bills", "doc", "red"),
            dd("Pharmacy Bill", "report", "blue", [
              { label: "Reprint / Search Bill", viewId: "pharma_bill_tools", params: { mode: "search" } },
              { label: "Void Pharmacy Bill (Admin)", viewId: "pharma_bill_tools", params: { mode: "void" }, perm: "void_bills" }
            ])
          ]
        }
      ]
    },
    {
      label: "Stock",
      items: [
        { kind: "large", ...btn("Purchase", "pharma_purchase", "truck", "green") },
        { kind: "large", ...btn("Returns", "pharma_purchase_returns", "alert", "amber") },
        { kind: "large", ...btn("Physical Stock Verification", "pharma_stock_verify", "cert", "blue") },
        {
          kind: "stack",
          rows: [
            btn("DC Purchase", "pharma_dc_purchase", "doc", "teal"),
            btn("Stock Update", "pharma_stock_update", "gear", "purple", {}, "manage_inventory_settings"),
            btn("Purchase Update", "pharma_purchase_update", "doc", "blue", {}, "approve_grn")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Delete Purchase", "pharma_delete_purchase", "lock", "red", {}, "approve_grn"),
            dd("Payment Report", "cash", "green", [
              { label: "Supplier Paid Invoices", viewId: "pharma_report", params: { report: "Supplier Payments" } },
              { label: "Supplier Credit Balance", viewId: "pharma_report", params: { report: "Supplier Credit" } }
            ]),
            dd("Pharmacy Orders", "pharmacy", "purple", [
              { label: "New Purchase Order", viewId: "pharma_orders", params: { mode: "new" } },
              { label: "Pending Reorder List", viewId: "pharma_orders", params: { mode: "reorder" } }
            ])
          ]
        }
      ]
    },
    {
      label: "Report",
      items: [
        {
          kind: "stack",
          rows: [
            dd("Sales", "report", "blue", [
              { label: "Daily Pharmacy Sales", viewId: "pharma_report", params: { report: "Daily Sales" } },
              { label: "Item-Wise Margin Summary", viewId: "pharma_report", params: { report: "Item Margin" }, perm: "view_financial_reports" }
            ]),
            dd("Stock", "pharmacy", "teal", [
              { label: "Current Stock Valuation", viewId: "pharma_report", params: { report: "Stock Valuation" }, perm: "view_financial_reports" },
              { label: "Near-Expiry Batch Alert", viewId: "pharma_report", params: { report: "Near Expiry" } },
              { label: "Low Stock Reorder Alert", viewId: "pharma_report", params: { report: "Low Stock" } }
            ]),
            btn("EOD Report", "pharma_report", "cash", "green", { report: "Pharmacy EOD" })
          ]
        },
        {
          kind: "stack",
          rows: [
            dd("GST Report", "cert", "purple", [
              { label: "GSTR-1 Sales Tax Summary", viewId: "pharma_report", params: { report: "GSTR-1" } },
              { label: "GSTR-2 Purchase Tax Input", viewId: "pharma_report", params: { report: "GSTR-2" } },
              { label: "HSN Tax Slab Summary", viewId: "pharma_report", params: { report: "HSN Summary" } }
            ]),
            dd("Purchase", "doc", "amber", [
              { label: "Purchase / GRN Register", viewId: "pharma_report", params: { report: "Purchase Register" } },
              { label: "Pending GRN Approvals", viewId: "admin_grn_approvals", perm: "approve_grn" }
            ]),
            dd("Sales Returns", "alert", "red", [
              { label: "Customer Returns Log", viewId: "pharma_report", params: { report: "Sales Returns" } }
            ])
          ]
        },
        {
          kind: "stack",
          rows: [
            dd("Audit Report", "lock", "red", [
              { label: "Stock Adjustment & Margin Audit", viewId: "pharma_report", params: { report: "Audit Report" } }
            ], "view_financial_reports"),
            btn("Payment Report", "pharma_report", "cash", "blue", { report: "Payment Mode Summary" }),
            btn("Sales Reminder", "pharma_sales_reminder", "sms", "green")
          ]
        }
      ]
    },
    {
      label: "Maintenance",
      items: [
        {
          kind: "large",
          ...dd("Maintenance", "gear", "purple", [
            { label: "Medicine Master Catalog", viewId: "master_catalog", params: { catalog: "Medicine" }, perm: "manage_inventory_settings" },
            { label: "Inventory & Expiry Thresholds", viewId: "admin_settings", perm: "manage_inventory_settings" }
          ], "manage_inventory_settings")
        },
        {
          kind: "stack",
          rows: [
            btn("Manufacturer", "master_catalog", "doc", "blue", { catalog: "Manufacturer" }, "manage_inventory_settings"),
            btn("Supplier", "master_catalog", "truck", "teal", { catalog: "Supplier" }, "manage_inventory_settings"),
            btn("Company", "master_catalog", "doc", "amber", { catalog: "Company" }, "manage_inventory_settings")
          ]
        }
      ]
    }
  ],

  cashier: [
    {
      label: "Billing Queues",
      items: [
        { kind: "large", ...btn("Dashboard", "cashier_dashboard", "dashboard", "green") },
        { kind: "large", ...btn("Pending Dashboard", "cashier_pending", "alert", "amber") },
        {
          kind: "stack",
          rows: [
            btn("Diagnostics", "cashier_queue_filter", "lab", "blue", { filter: "Diagnostics" }),
            btn("PreBooking", "cashier_queue_filter", "cert", "teal", { filter: "PreBooking" }),
            btn("Emergency Count", "cashier_queue_filter", "alert", "red", { filter: "Emergency" })
          ]
        }
      ]
    },
    {
      label: "Collection Reports",
      items: [
        {
          kind: "large",
          ...dd("EOD Report", "cash", "green", [
            { label: "Shift EOD Cash Summary", viewId: "cashier_report", params: { report: "EOD Summary" } },
            { label: "Department-Wise Revenue", viewId: "cashier_report", params: { report: "Dept Revenue" }, perm: "view_financial_reports" }
          ])
        },
        {
          kind: "stack",
          rows: [
            btn("Daily Report", "cashier_report", "report", "blue", { report: "Daily Report" }),
            btn("Collection Summary", "cashier_report", "cash", "green", { report: "Collection Summary" }),
            btn("Consolidated Payment Report", "cashier_report", "report", "purple", { report: "Consolidated Payment" }, "view_financial_reports")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Discount Report", "cashier_report", "alert", "amber", { report: "Discount Report" }, "view_financial_reports"),
            btn("Pending Payment Report", "cashier_report", "alert", "red", { report: "Pending Payment" }),
            dd("Patient Reports", "users", "teal", [
              { label: "Patient Ledger Statement", viewId: "cashier_report", params: { report: "Patient Ledger" } },
              { label: "OP/IP Receipt Register", viewId: "cashier_report", params: { report: "Receipt Register" } }
            ])
          ]
        },
        {
          kind: "stack",
          rows: [
            dd("Doctor Collection", "doctor", "blue", [
              { label: "Revenue by Physician", viewId: "cashier_report", params: { report: "Doctor Collection" } }
            ], "view_financial_reports"),
            btn("Uncleared Payments", "cashier_uncleared", "cash", "amber")
          ]
        }
      ]
    },
    {
      label: "Settlement & Export",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Payments", "cashier_payments", "cash", "green"),
            dd("Tally Report", "report", "purple", [
              { label: "Export Tally XML Vouchers", viewId: "cashier_tally", params: { format: "XML" } },
              { label: "Export Tally CSV Ledger", viewId: "cashier_tally", params: { format: "CSV" } }
            ], "view_financial_reports")
          ]
        }
      ]
    }
  ],

  maintenance: [
    {
      label: "Clinical & Operational Masters",
      items: [
        { kind: "large", ...btn("Medicine", "master_catalog", "pharmacy", "blue", { catalog: "Medicine" }) },
        { kind: "large", ...btn("Medicine Type", "master_catalog", "doc", "teal", { catalog: "Medicine Type" }) },
        { kind: "large", ...btn("Generic Medicine", "master_catalog", "pharmacy", "green", { catalog: "Generic Medicine" }) },
        { kind: "large", ...btn("Medical Kit", "master_catalog", "cert", "amber", { catalog: "Medical Kit" }) },
        { kind: "large", ...btn("Symptoms", "master_catalog", "doctor", "red", { catalog: "Symptoms" }) },
        { kind: "large", ...btn("Template Master", "master_catalog", "doc", "purple", { catalog: "Template Master" }) },
        {
          kind: "stack",
          rows: [
            btn("Illness", "master_catalog", "doc", "red", { catalog: "Illness" }),
            btn("Services", "master_catalog", "cash", "blue", { catalog: "Services" }),
            btn("Insurance", "master_catalog", "cert", "green", { catalog: "Insurance" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Vaccination", "master_catalog", "doctor", "teal", { catalog: "Vaccination" }),
            btn("Specialisation", "master_catalog", "users", "blue", { catalog: "Specialisation" }),
            btn("Service Providers", "master_catalog", "users", "purple", { catalog: "Service Providers" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Operation Kit", "master_catalog", "cert", "amber", { catalog: "Operation Kit" }),
            btn("Follow Up Advice", "master_catalog", "sms", "green", { catalog: "Follow Up Advice" }),
            btn("Inpatient Template", "master_catalog", "bed", "blue", { catalog: "Inpatient Template" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("ICD Code", "master_catalog", "doc", "purple", { catalog: "ICD Code" }),
            btn("Operation Theater", "master_catalog", "bed", "red", { catalog: "Operation Theater" }),
            btn("Medicine Frequency", "master_catalog", "pharmacy", "teal", { catalog: "Medicine Frequency" })
          ]
        }
      ]
    },
    {
      label: "Specialty Registries",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Dictionary", "master_catalog", "doc", "blue", { catalog: "Dictionary" }),
            btn("Optical Kit", "master_catalog", "doc", "teal", { catalog: "Optical Kit" }),
            btn("Eye Power", "master_catalog", "doc", "purple", { catalog: "Eye Power" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Employer", "master_catalog", "users", "amber", { catalog: "Employer" }),
            btn("City Master", "master_catalog", "doc", "green", { catalog: "City Master" }),
            btn("Dialysis Type", "master_catalog", "lab", "red", { catalog: "Dialysis Type" })
          ]
        },
        { kind: "large", ...btn("Physiotherapy Score Master", "master_catalog", "cert", "green", { catalog: "Physiotherapy Score Master" }) }
      ]
    },
    {
      label: "Lab",
      items: [
        {
          kind: "large",
          ...dd("Lab Test", "lab", "blue", [
            { label: "Bloodtest Catalog", viewId: "lab_test_catalog", params: { category: "Bloodtest" } },
            { label: "XRay & Scan Catalog", viewId: "lab_test_catalog", params: { category: "Scan Type" } }
          ])
        }
      ]
    },
    {
      label: "Cashier",
      items: [
        {
          kind: "large",
          ...dd("Cash", "cash", "green", [
            { label: "Payment Modes & Discount Rules", viewId: "admin_settings" },
            { label: "Receipt Prefix & Tax Settings", viewId: "admin_settings" }
          ])
        }
      ]
    }
  ],

  accounts: [
    {
      label: "Cash Close",
      items: [
        { kind: "large", ...btn("Final Cash Close", "acc_cash_close", "cash", "green") },
        { kind: "large", ...btn("Final Cash Close Log", "acc_cash_close_log", "report", "blue") }
      ]
    },
    {
      label: "Accounts",
      items: [
        { kind: "large", ...btn("Add Accounts", "acc_chart", "doc", "blue") },
        { kind: "large", ...btn("Pending Expense", "acc_pending_expense", "alert", "amber") },
        { kind: "large", ...btn("Add Expenses", "acc_add_expense", "cash", "red") },
        { kind: "large", ...btn("Add Receivable", "acc_receivables", "cash", "teal") }
      ]
    },
    {
      label: "Reports",
      items: [
        {
          kind: "stack",
          rows: [
            btn("Transaction Report", "acc_reports", "report", "blue", { type: "transactions" }),
            btn("Expenses Report", "acc_reports", "report", "red", { type: "expenses" }),
            btn("Receivables Report", "acc_reports", "report", "teal", { type: "receivables" })
          ]
        },
        { kind: "large", ...btn("Accounts Audit", "acc_reports", "lock", "purple", { type: "audit" }, "view_financial_reports") }
      ]
    },
    {
      label: "Bill Search",
      items: [
        { kind: "large", ...btn("Cashier Bill Search", "acc_bill_search", "cash", "blue", { source: "cashier" }) },
        { kind: "large", ...btn("Pharmacy Bill Search", "acc_bill_search", "pharmacy", "green", { source: "pharmacy" }) }
      ]
    },
    {
      label: "Credit Report",
      items: [
        { kind: "large", ...btn("Credit Pending Report", "acc_credit_pending", "alert", "amber") },
        { kind: "large", ...btn("Doctor Income Payment", "acc_doctor_payout", "doctor", "green") },
        { kind: "large", ...btn("Doctor Income Payment Report", "acc_doctor_payout_report", "report", "purple") }
      ]
    }
  ],

  reports: [
    {
      label: "Core Analytics",
      items: [
        { kind: "large", ...btn("Visit Details", "ent_report", "users", "blue", { report: "Visit Details" }) },
        { kind: "large", ...btn("IP Log Report", "ent_report", "bed", "teal", { report: "IP Log Report" }) },
        { kind: "large", ...btn("Diagnostics Chart", "ent_report", "lab", "purple", { report: "Diagnostics Chart" }) },
        { kind: "large", ...btn("Patient Analysis", "ent_report", "dashboard", "green", { report: "Patient Analysis" }) },
        { kind: "large", ...btn("Lab EOD Report", "ent_report", "report", "amber", { report: "Lab EOD Report" }) }
      ]
    },
    {
      label: "Compliance, Clinical & Audit Reports",
      items: [
        {
          kind: "stack",
          rows: [
            btn("EOD Report", "ent_report", "cash", "green", { report: "EOD Report" }, "view_financial_reports"),
            btn("TDS", "ent_report", "cert", "purple", { report: "TDS" }, "view_financial_reports"),
            btn("Audit Report", "ent_report", "lock", "red", { report: "Audit Report" }, "view_financial_reports")
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Patient Payment History", "ent_report", "cash", "blue", { report: "Patient Payment History" }),
            btn("Deleted Charges/Payment", "ent_report", "alert", "red", { report: "Deleted Charges/Payment" }, "view_financial_reports"),
            btn("Patient Register Report", "ent_report", "users", "teal", { report: "Patient Register Report" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Surgery Report", "ent_report", "doctor", "blue", { report: "Surgery Report" }),
            btn("PreBooking Report", "ent_report", "cert", "amber", { report: "PreBooking Report" }),
            btn("Review/Appt Report", "ent_report", "doc", "green", { report: "Review/Appt Report" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("IUD Report", "ent_report", "cert", "purple", { report: "IUD Report" }),
            btn("Illness Report", "ent_report", "doc", "amber", { report: "Illness Report" }),
            btn("Patient By Illness", "ent_report", "users", "red", { report: "Patient By Illness" })
          ]
        },
        {
          kind: "stack",
          rows: [
            btn("Diagnosis Report", "ent_report", "doctor", "blue", { report: "Diagnosis Report" }),
            btn("Patient Statistics", "ent_report", "dashboard", "green", { report: "Patient Statistics" }),
            btn("External Lab Report", "ent_report", "lab", "purple", { report: "External Lab Report" })
          ]
        },
        {
          kind: "stack",
          rows: [
            dd("CE Reports", "report", "teal", [
              { label: "Clinical Excellence Summary", viewId: "ent_report", params: { report: "CE Summary" } },
              { label: "Monthly Bed Occupancy KPI", viewId: "ent_report", params: { report: "CE Occupancy" } }
            ]),
            btn("ICD Report", "ent_report", "doc", "blue", { report: "ICD Report" }),
            btn("Cash Close Log Report", "ent_report", "cash", "amber", { report: "Cash Close Log Report" }, "view_financial_reports")
          ]
        }
      ]
    }
  ],

  certificate: [
    {
      label: "Statutory & Medical Certificates",
      items: [
        { kind: "large", ...btn("Medical Certificate", "cert_issue", "cert", "blue", { certType: "Medical Certificate" }) },
        { kind: "large", ...btn("Fitness Certificate", "cert_issue", "cert", "green", { certType: "Fitness Certificate" }) },
        { kind: "large", ...btn("Birth Certificate", "cert_issue", "cert", "amber", { certType: "Birth Certificate" }) },
        { kind: "large", ...btn("Death Certificate", "cert_issue", "cert", "red", { certType: "Death Certificate" }) }
      ]
    },
    {
      label: "Register",
      items: [
        { kind: "large", ...btn("Certificate Register", "cert_register", "report", "purple") }
      ]
    }
  ],

  equipments: [
    {
      label: "Biomedical Asset Lifecycle",
      items: [
        { kind: "large", ...btn("Equipment Registry", "equip_registry", "gear", "blue") },
        { kind: "large", ...btn("Calibration & AMC", "equip_calibration", "cert", "green") },
        { kind: "large", ...btn("Service & Breakdown Log", "equip_service", "alert", "amber") },
        { kind: "large", ...btn("Equipment Audit", "service_report", "report", "purple") }
      ]
    }
  ],

  admin: [
    {
      label: "User & Security Control",
      items: [
        { kind: "large", ...btn("User Management", "admin_users", "users", "blue", {}, "manage_users") },
        { kind: "large", ...btn("GRN Approvals", "admin_grn_approvals", "cert", "green", {}, "approve_grn") },
        { kind: "large", ...btn("System Settings", "admin_settings", "gear", "purple", {}, "admin") }
      ]
    },
    {
      label: "Governance & Requests",
      items: [
        { kind: "large", ...btn("Audit Trail", "admin_audit", "lock", "red", {}, "view_financial_reports") },
        { kind: "large", ...btn("Leave Approvals", "admin_leaves", "doc", "amber", {}, "admin") },
        { kind: "large", ...btn("Support Tickets", "admin_tickets", "sms", "teal", {}, "admin") }
      ]
    }
  ],

  physiotherapy: [
    {
      label: "Therapy & Rehab",
      items: [
        { kind: "large", ...btn("Session Scheduler", "physio_sessions", "doctor", "blue") },
        { kind: "large", ...btn("Outcome Scoring", "physio_scoring", "cert", "green") },
        { kind: "large", ...btn("Physio Score Master", "master_catalog", "gear", "teal", { catalog: "Physiotherapy Score Master" }) },
        { kind: "large", ...btn("Therapy Report", "physio_report", "report", "purple") }
      ]
    }
  ],

  store: [
    {
      label: "Central Non-Medical Store",
      items: [
        { kind: "large", ...btn("Store Inventory", "store_inventory", "pharmacy", "blue") },
        { kind: "large", ...btn("Store GRN / Purchase", "store_purchase", "truck", "green") },
        { kind: "large", ...btn("Dept Stock Issue", "store_issue", "doc", "amber") },
        { kind: "large", ...btn("Store Report", "store_report", "report", "purple") }
      ]
    }
  ],

  ambulance: [
    {
      label: "Fleet & Dispatch",
      items: [
        { kind: "large", ...btn("Fleet Registry", "amb_fleet", "truck", "blue") },
        { kind: "large", ...btn("Emergency Dispatch", "amb_dispatch", "alert", "red") },
        { kind: "large", ...btn("Trip Billing", "amb_billing", "cash", "green") },
        { kind: "large", ...btn("Trip & Mileage Report", "amb_report", "report", "amber") }
      ]
    }
  ],

  skin: [
    {
      label: "Dermatology & Aesthetics",
      items: [
        { kind: "large", ...btn("Skin Consultation", "skin_consult", "doctor", "purple") },
        { kind: "large", ...btn("Procedure Packages", "skin_packages", "cert", "teal") },
        { kind: "large", ...btn("Skin Billing & Report", "skin_report", "cash", "blue") }
      ]
    }
  ]
};
