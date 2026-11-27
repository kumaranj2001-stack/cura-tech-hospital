# See Curavite Hospital Management — Enterprise Clinic & Pharmacy ERP

A vibrant, responsive, enterprise-grade **Hospital Management, Pharmacy POS, Laboratory & Billing ERP** web application built using **100% free tools** (VS Code, HTML5, CSS3, JavaScript ES6, Firebase Free Spark Tier, GitHub, and Vercel).

## Highlights

- **Collapsible Side Hamburger Navigation**:
  - Top dynamic gradient header displaying **`See Curavite Hospital Management (DD/MMM/YYYY)`**, hamburger menu toggle (`☰`), live connection pill (`Local Sandbox` / `Firebase Live`), user profile greeting, role badge, auto-lock timer, and instant **Log Off**.
  - Collapsible & searchable side drawer/rail housing all **17 departmental hubs** and **every clinical, lab, pharmacy, billing, accounting, and admin workflow** without omissions:
    `Facility Hub`, `See Curavite`, `Patient`, `Doctor`, `Lab`, `Pharmacy`, `Cashier`, `Maintenance`, `Accounts`, `Reports`, `Certificate`, `Equipments`, `Admin`, `Physiotherapy`, `Store`, `Ambulance`, and `Skin`.
  - Smoothly adapts across **mobile phones, tablets, and desktop monitors** with a rail-collapse mode on desktop and slide-over drawer on mobile.
- **Session-Only Security & Auto-Logout on Exit**:
  - Uses `browserSessionPersistence` + `sessionStorage` so closing the browser/tab automatically logs out.
  - Configurable inactivity auto-logout countdown + optional strict immediate logout on tab/app switch.
- **Role-Based Access Control (RBAC)**:
  - **Admin (`kumaran` / `kumaranjkms`)**: Full control — User Management (create users, assign roles, edit 20-permission matrix, reset passwords, activate/deactivate accounts), GRN Approvals, Inventory & System Settings, Audit Trail, Financial Reports & Bill Voids.
  - **Staff (`staff123` / `kumaranjk`)**: Front-office Patient Registration, OP/IP entries, Cashier Billing, Pharmacy Counter/Rx Sales & drafting GRNs (`Pending Approval`), Lab Sample Entries — restricted from approving GRNs, altering inventory settings, voiding bills, or viewing restricted financial/admin modules.

## Project Structure

```text
see-curavite-hospital-management/
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
│   └── verify-erp.mjs           # Automated integrity, white-label & RBAC verification tests
└── public/                      # Deployable static app root (Vercel & Firebase)
    ├── index.html
    ├── manifest.json
    ├── assets/icon.svg
    ├── css/                     # variables.css, sidebar.css, style.css, print.css
    └── js/                      # firebase-config.js, seed-data.js, db.js, auth.js, ui.js, etc.
        └── modules/             # Modular screens for all 16+ departments
```

## Quick Start in VS Code

1. Open this folder in **VS Code**.
2. Install the **Live Server** extension, right-click `public/index.html`, and choose **Open with Live Server** (or run `npm start` in VS Code Terminal).
3. Sign in immediately in **Local Sandbox** mode:
   - **Admin:** `kumaran` / `kumaranjkms`
   - **Staff:** `staff123` / `kumaranjk`
4. Follow **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** to connect your free **Firebase** database, push to **GitHub**, and deploy live on **Vercel**.
