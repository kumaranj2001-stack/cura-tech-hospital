# CuraTech Hospital Management — Enterprise Clinic & Pharmacy ERP

A responsive, light-themed, enterprise-grade **Hospital Management, Laboratory, Billing & Pharmacy ERP** web application built using **100% free tools** (HTML5, CSS3, ES6 JavaScript, Firebase Free Spark Plan, VS Code, and GitHub).

## Key Features

- **17-Area Ribbon Navigation Shell**:
  - Far-left **Facility Hub** button (`Dashboard`, `Equipments`, `Daily Worksheet`, `Service/Worksheet Reports`, `Gate Pass Management`, `Document Upload/Archive`)
  - **16 Departmental Tabs**: `CuraTech`, `Patient`, `Doctor`, `Lab`, `Pharmacy`, `Cashier`, `Maintenance`, `Accounts`, `Reports`, `Certificate`, `Equipments`, `Admin`, `Physiotherapy`, `Store`, `Ambulance`, and `Skin`
- **Security & Auto-Logout**:
  - Session-only persistence (`browserSessionPersistence` + `sessionStorage`) so closing the browser/tab logs out automatically.
  - Configurable inactivity auto-logout countdown + optional strict tab-hide auto-logout.
- **Role-Based Access Control (RBAC)**:
  - **Admin (`kumaran`)**: Full control — Create/edit users, assign roles & granular 20-permission matrix, reset passwords, activate/deactivate accounts, approve GRNs, manage inventory settings, view full financial reports & audit logs.
  - **Staff (`staff123`)**: Front-office patient registration, OP/IP entries, Cashier billing, Pharmacy counter & Rx dispensing, Lab sample entry — restricted from approving GRNs, editing inventory settings, voiding bills, or viewing restricted financial/admin modules.
- **Clinical, Pharmacy & Billing Pipelines**:
  - UHID & Code39 SVG Barcode generation, OP Tokens, Ward/Bed Occupancy Map, IP Discharge Settlement
  - Nursing Prescreening Vitals (auto-BMI) & Doctor EMR with ICD-10 diagnosis + E-Prescriptions
  - Pharmacy POS with GST calculation, batch/expiry tracking, 80mm thermal receipt printing, and Admin-approved GRN workflow
  - Tally ERP XML voucher export, A4 Lab Reports & Medical Certificates, SMS & WhatsApp notification hooks

## Project Folder Structure

```text
guru-hospital/
├── .firebaserc               # Your Firebase Project ID alias
├── .gitignore                # Files excluded from GitHub
├── firebase.json             # Firebase Hosting & Firestore config
├── firestore.rules           # Server-side RBAC security rules
├── firestore.indexes.json    # Firestore composite indexes
├── package.json              # Optional local server / deploy shortcuts
├── README.md                 # Project overview
├── SETUP_GUIDE.md            # Complete beginner step-by-step guide
└── public/                   # Everything deployed to Firebase Hosting
    ├── index.html            # Application entry point
    ├── manifest.json         # Mobile PWA "Add to Home Screen" manifest
    ├── assets/icon.svg       # Hospital emblem icon
    ├── css/                  # Theme variables, layout, ribbon, and print styles
    └── js/
        ├── firebase-config.js
        ├── seed-data.js
        ├── db.js
        ├── auth.js
        ├── barcode.js
        ├── print.js
        ├── sms.js
        ├── ui.js
        ├── ribbon-config.js
        ├── app.js
        └── modules/          # Modular screens per department
```

## Quick Start (Zero Setup Testing)

Because ES Modules require an HTTP server, open the folder in **VS Code**:
1. Install the **Live Server** extension in VS Code.
2. Right-click `public/index.html` and choose **Open with Live Server** (or run `npm start` in the VS Code terminal).
3. Sign in in **Local Sandbox** mode using your initial accounts, then follow [SETUP_GUIDE.md](./SETUP_GUIDE.md) to connect Firebase Hosting & Cloud Firestore for live multi-device access!
