# Beginner-Friendly Step-by-Step Setup, Deployment & Maintenance Guide

This guide walks you through every step — **even with zero coding experience** — to set up **See Curavite Hospital Management** in VS Code, connect **Firebase (100% Free Spark Plan)**, upload your project to **GitHub**, deploy it online for free on **Vercel**, and use it on both **computers and mobile phones**.

---

## 1. Default Login Credentials

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `kumaran` | `kumaranjkms` | Full control: Create/manage users, roles & permissions, approve GRNs, manage inventory & system settings, view all financial reports & audit logs |
| **Staff** | `staff123` | `kumaranjk` | Front-office OP/IP reception, Cashier billing, Pharmacy Rx/POS sales, Lab entries, draft GRNs (`Pending Approval`). Restricted from approving GRNs, editing inventory settings, voiding bills, or viewing admin/financial audit modules |

> **Auto-Logout on Exit:** The app uses session-only storage (`browserSessionPersistence` + `sessionStorage`). Whenever you close the browser tab or exit the app, you are automatically logged out for security.

---

## 2. Step-by-Step: Open & Test in VS Code

1. Install **Visual Studio Code (VS Code)** and **Node.js (LTS)** (both 100% free).
2. Open VS Code -> click **File -> Open Folder...** -> choose your project folder.
3. Install the **Live Server** extension (by Ritwick Dey) from the VS Code Extensions panel (`Ctrl+Shift+X`).
4. In the VS Code Explorer sidebar, open the `public/` folder, **right-click `index.html`**, and click **Open with Live Server**.
   - *Alternative:* Open Terminal (`Ctrl + ~`), type `npm start`, and open `http://localhost:5000`.
5. Log in with `kumaran` / `kumaranjkms` to test every module right away in **Local Sandbox** mode.

---

## 3. Step-by-Step: Connect Firebase (Free Spark Tier)

Firebase's **Spark Plan** is completely free with no subscription or time limit.

### Step 3A — Create Firebase Project
1. Visit [https://console.firebase.google.com/](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Create a project**, enter `see-curavite-hospital`, click **Continue**, and click **Create project**.

### Step 3B — Enable Firebase Authentication
1. In the left sidebar, go to **Build -> Authentication -> Get started**.
2. Open the **Sign-in method** tab, click **Email/Password**, toggle **Enable** ON, and click **Save**.
3. Open the **Users** tab -> click **Add user** to add your initial Admin login:
   - **Email:** `kumaran@curavite.hospital`
   - **Password:** `kumaranjkms`
   *(Create `staff123` inside the live app under **Admin -> User Management** after logging in as `kumaran`, so its Firestore role & permissions are generated automatically!)*

### Step 3C — Create Cloud Firestore Database & Security Rules
1. In the left sidebar, go to **Build -> Firestore Database -> Create database**.
2. Choose a nearby region (for India, choose `asia-south1 (Mumbai)`), select **Start in production mode**, and click **Create**.
3. Go to the **Rules** tab inside Firestore Database, copy the entire contents of `firestore.rules` from your VS Code project, paste it into the Firebase Rules editor, and click **Publish**.

### Step 3D — Connect Firebase Config to Your Code
1. In Firebase Console, click the **Gear icon** next to Project Overview -> **Project settings**.
2. Under **Your apps**, click the **`</>` (Web)** icon, type nickname `See Curavite Web`, and click **Register app**.
3. Copy the `firebaseConfig` keys (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
4. In VS Code, open `public/js/firebase-config.js` and replace the placeholder values (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.) with your copied values, then save (`Ctrl+S`).
5. Also open `.firebaserc` and replace `"YOUR_FIREBASE_PROJECT_ID"` with your Firebase Project ID.

### Step 3E — Seed Hospital Sample Data & Create Staff User
1. Reload the website using Live Server and sign in as **`kumaran`** (`kumaranjkms`).
2. Confirm the header pill now shows **`Firebase Live`**.
3. Open the hamburger menu -> **Admin** -> **System Settings** -> click **Seed Sample Hospital Data** once to add sample medicines, beds, lab tests, doctors, and settings to Firestore.
4. Open **Admin -> User Management** -> click **+ Create New User** and add:
   - **Username:** `staff123`
   - **Full Name:** `Front Office & Pharmacy Staff`
   - **Password:** `kumaranjk`
   - **Role:** `Staff (Restricted)`

---

## 4. Step-by-Step: Upload Code to GitHub

1. Create a free account at [https://github.com](https://github.com) and click **New repository** (e.g., `see-curavite-hospital`).
2. In VS Code Terminal (`Ctrl + ~`), run:
   ```bash
   git add .
   git commit -m "See Curavite Hospital Management ready for Vercel and Firebase"
   git push origin main
   ```
   *(If setting up a brand new repository for the first time, run `git remote add origin https://github.com/YOUR_USERNAME/see-curavite-hospital.git` before `git push -u origin main`.)*

---

## 5. Step-by-Step: Deploy Online Using Vercel (100% Free)

1. Go to [https://vercel.com](https://vercel.com) and click **Sign Up / Log In** using **Continue with GitHub**.
2. Click **Add New... -> Project**.
3. Find your `see-curavite-hospital` GitHub repository and click **Import**.
4. Leave the default settings as they are — **`vercel.json` is already pre-configured** to serve `public/` directly with zero build errors!
   - Framework Preset: `Other`
   - Output Directory: `public` (automatically read from `vercel.json`)
5. Click **Deploy**. In ~15 seconds, Vercel gives you a live HTTPS URL (for example: `https://see-curavite-hospital.vercel.app`)!
6. **Important:** Copy your Vercel domain, open **Firebase Console -> Authentication -> Settings -> Authorized domains -> Add domain**, and add your Vercel URL so Firebase Authentication works seamlessly from Vercel!

---

## 6. Using Online on Mobile Phones, Tablets & Computers

- **Desktop / Laptop Shop Counter:** Open your Vercel URL in Chrome or Edge. Connect a standard 80mm thermal receipt printer or A4 printer and use **Ctrl+P / Print Receipt** from Pharmacy POS or Cashier Billing. Use the top-left **☰** hamburger button anytime to collapse the sidebar into an icon rail or expand full module labels.
- **Mobile Phone / Tablet:** Open the same Vercel URL in Chrome (Android) or Safari (iPhone/iPad):
  - Tap the top-left **☰** hamburger button to slide open the full searchable department menu, and tap any action to jump straight to that screen.
  - Tap your browser menu -> **Add to Home Screen** to install **See Curavite Hospital Management** as an app icon on your phone.
- **Real-Time Sync Across Devices:** Any patient, OP visit, lab report, pharmacy sale, or GRN entry saved on one computer or mobile appears in real time for all logged-in staff when connected to Firebase!

---

## 7. Updating, Fixing Errors & Maintaining the App

- **How to Update the Software:** Edit files in VS Code, run `npm test` in VS Code Terminal to verify there are no syntax/module/menu errors, then commit and `git push`. Vercel automatically redeploys your updated site within seconds!
- **How to Fix Common Issues:**
  - *Login says "Invalid username/password" after connecting Firebase:* Ensure Email/Password is enabled in Firebase Authentication and `kumaran@curavite.hospital` exists in Firebase Console -> Authentication -> Users.
  - *Firebase shows "Missing or insufficient permissions":* Make sure you pasted and published `firestore.rules` in Firebase Console -> Firestore -> Rules.
  - *Staff user cannot approve GRN or change inventory settings:* That is intentional RBAC security! Log in as Admin (`kumaran`) or grant that specific permission in **Admin -> User Management -> Permissions**.
  - *Want to inspect/run automated checks anytime:* Run `npm test` in VS Code Terminal to verify all modules, routes, white-label rules, and credentials pass cleanly.
