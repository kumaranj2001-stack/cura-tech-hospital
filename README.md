# Guru Hospital — Nalam+ Enterprise Hospital & Pharmacy ERP

A responsive, light-colored, enterprise-grade **Hospital Management, Pharmacy POS, Laboratory & Billing ERP** web application modeled after the **Nalam+** ribbon interface and built for **Guru Hospital** using **100% free tools** (VS Code, HTML5, CSS3, JavaScript ES6, Firebase Free Spark Tier, GitHub, and Vercel).

## Highlights

- **Nalam+ Ribbon Navigation Shell**:
  - Persistent dark charcoal top bar with centered **`Guru Hospital — Nalam+ (DD/MMM/YYYY)`**, live status pill, user greeting (`Welcome KUMARAN`), role badge, and instant **Log Off**.
  - Far-left **glossy blue square application button** (`Facility Hub`: Executive Dashboard, Equipments, Daily Worksheet, Service/Worksheet Reports, Gate Pass Management/Report, Document Upload/Report).
  - **16 Departmental Tabs**: `Nalam+`, `Patient`, `Doctor`, `Lab`, `Pharmacy`, `Cashier`, `Maintenance`, `Accounts`, `Reports`, `Certificate`, `Equipments`, `Admin`, `Physiotherapy`, `Store`, `Ambulance`, and `Skin`.
  - Fully responsive on **mobile phones, tablets, and desktop PCs** (including a quick mobile department switcher and scrollable tables/modals).
- **Session-Only Security & Auto-Logout on Exit**:
  - Uses `browserSessionPersistence` + `sessionStorage` so closing the browser/tab automatically logs out.
  - Configurable inactivity auto-logout countdown + optional strict immediate logout on tab/app switch.
- **Role-Based Access Control (RBAC)**:
  - **Admin (`kumaran` / `kumaranjkms`)**: Full access — User Management panel (create users, assign roles, edit 20-permission matrix, reset passwords, activate/deactivate accounts), GRN Approvals, Inventory & System Settings, Audit Trail, Financial Reports & Bill Voids.
  - **Staff (`staff123` / `kumaranjk`)**: Front-office Patient Registration, OP/IP entries, Cashier Billing, Pharmacy Counter/Rx Sales & drafting GRNs (`Pending Approval`), Lab Sample Entries — blocked from approving GRNs, altering inventory settings, voiding bills, or viewing restricted financial/admin panels.

## Project Structure

```text
guru-hospital/
├── .env.example                 # Reference template for Firebase / webhook config
├── .firebaserc                  # Firebase Project ID mapping
├── .gitignore                   # Excludes node_modules, .env, local cache
├── firebase.json                # Firebase Hosting & Firestore configuration
├── firestore.indexes.json       # Cloud Firestore indexes
├── firestore.rules              # Server-side RBAC security rules
├── package.json                 # Local test & static server scripts
├── vercel.json                  # Zero-build Vercel deployment configuration
├── README.md                    # Overview & quick start
├── SETUP_GUIDE.md               # Step-by-step beginner guide (VS Code, Firebase, GitHub, Vercel, Mobile)
├── database/
│   ├── schema.sql               # Relational PostgreSQL / Supabase schema reference
│   └── supabase-config.example.js
├── tests/
│   └── verify-erp.mjs           # Automated integrity & RBAC verification tests
└── public/                      # Deployable static app root (Vercel & Firebase)
    ├── index.html
    ├── manifest.json
    ├── assets/icon.svg
    ├── css/                     # variables.css, ribbon.css, style.css, print.css
    └── js/                      # firebase-config.js, seed-data.js, db.js, auth.js, ui.js, etc.
        └── modules/             # Modular screens for all 16 departments
```

## Quick Start in VS Code

1. Open this folder in **VS Code**.
2. Install the **Live Server** extension, right-click `public/index.html`, and choose **Open with Live Server** (or run `npm start` in VS Code Terminal).
3. Sign in immediately in **Local Sandbox** mode:
   - **Admin:** `kumaran` / `kumaranjkms`
   - **Staff:** `staff123` / `kumaranjk`
4. Follow **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** to connect your free **Firebase** database, push to **GitHub**, and deploy live on **Vercel**.
