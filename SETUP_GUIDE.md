# Beginner-Friendly Step-by-Step Setup, Deployment & Maintenance Guide

This guide walks you step by step — even if you have **zero coding experience** — to open **CuraTech Hospital Management** in VS Code, connect **Firebase (100% Free Tier)**, upload to **GitHub**, deploy live online with **Firebase Hosting**, and use it on both **computers and mobile phones**.

---

## 1. Initial Login Accounts

When running in **Local Sandbox** (before Firebase keys are added) OR after creating these two users in Firebase Authentication:

| Role | Username | Initial Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `kumaran` | `kumaranjkms` | Full control: Users, Roles, GRN Approvals, Inventory Settings, Financial Reports |
| **Staff** | `staff123` | `kumaranjk` | Front Office, OP/IP Registration, Billing, Pharmacy Sales, Lab Entries |

> **Important Security Tip:** Once your Firebase project is live, log in as `kumaran` and use **CuraTech -> Change Password** (or Firebase Console) if you ever want to rotate passwords, and create separate accounts for each staff member in **Admin -> User Management**.

---

## 2. Step-by-Step: Open & Test in VS Code

1. Download and install **Visual Studio Code (VS Code)** and **Node.js (LTS)** (both free).
2. Open VS Code -> **File -> Open Folder...** -> select:
   `Desktop\hospital\guru-hospital`
3. In VS Code Extensions (`Ctrl+Shift+X`), install **Live Server** (by Ritwick Dey).
4. In the VS Code Explorer sidebar, expand `public/`, right-click `index.html`, and click **Open with Live Server**.
   - *(Alternative)* Open Terminal in VS Code (`Ctrl + ~`), type `npm start`, and open `http://localhost:5000` in Chrome/Edge.
5. Sign in with `kumaran` / `kumaranjkms` to test every department immediately in **Local Sandbox** mode.

---

## 3. Step-by-Step: Connect Firebase (100% Free Spark Plan)

Firebase's **Spark Plan** is completely free with no expiration date (generous daily quotas for Auth, Firestore, and Hosting).

### A. Create the Firebase Project
1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/) and sign in with Google.
2. Click **Create a project** -> name it `curatech-hospital` (or `guru-hospital`) -> click **Continue** (Google Analytics optional) -> **Create project**.

### B. Enable Authentication
1. In the left sidebar, click **Build -> Authentication -> Get started**.
2. Under **Sign-in method**, click **Email/Password** -> enable **Email/Password** -> **Save**.
3. Click the **Users** tab -> **Add user** to create your initial Admin account:
   - **Email**: `kumaran@curatech.hospital`
   - **Password**: `kumaranjkms`
   *(You will create `staff123` and other staff accounts directly inside the app's **Admin -> User Management** panel after logging in as `kumaran`, so their Firestore role & permissions are created automatically!)*

### C. Create Cloud Firestore Database
1. In the left sidebar, click **Build -> Firestore Database -> Create database**.
2. Choose your closest region (e.g., `asia-south1 (Mumbai)`), select **Start in production mode**, and click **Create**.
3. Wait ~30 seconds for Firestore to initialize.

### D. Copy Your Firebase Keys into the Project
1. Click the **Gear Icon** next to Project Overview -> **Project settings**.
2. Scroll down to **Your apps** -> click the **`</>` (Web)** icon -> register nickname `CuraTech Web` -> **Register app**.
3. Copy the `firebaseConfig` object shown on screen.
4. In VS Code, open `public/js/firebase-config.js` and replace the placeholder values (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.) with your copied values, then save (`Ctrl+S`).

### E. Put Your Project ID in `.firebaserc`
1. Open `.firebaserc` in VS Code.
2. Replace `"YOUR_FIREBASE_PROJECT_ID"` with your actual Firebase Project ID (found in Project Settings).

### F. Seed Initial Hospital Data into Firestore
1. Reload the app via Live Server and log in as **`kumaran`** (`kumaranjkms`).
2. Notice the top-left badge now says **`Firebase Live`**.
3. Click the **Admin** tab -> **System Settings** -> click **Seed Sample Hospital Data** once to populate sample medicines, beds, lab tests, doctors, and settings in Firestore!
4. Next, open **Admin -> User Management** -> click **+ Create New User** and create your Staff account (`username: staff123`, `password: kumaranjk`, `role: Staff`). Now staff members can log in from any computer or mobile phone!

---

## 4. Step-by-Step: Upload Code to GitHub

1. Create a free account at [https://github.com](https://github.com) and click **New repository** -> name it `curatech-hospital-erp` -> **Create repository**.
2. In VS Code Terminal (`Ctrl + ~`), run:
   ```bash
   git init
   git add .
   git commit -m "Initial CuraTech Hospital ERP setup"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/curatech-hospital-erp.git
   git push -u origin main
   ```
   *(Or open **GitHub Desktop**, click Add Existing Repository, select `guru-hospital`, commit, and click Publish Repository!)*

---

## 5. Step-by-Step: Deploy Online Using Firebase Hosting

1. In VS Code Terminal, install Firebase CLI once:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Google Firebase:
   ```bash
   firebase login
   ```
3. Deploy Hosting + Firestore Security Rules + Indexes in one command:
   ```bash
   firebase deploy
   ```
4. Firebase prints your live HTTPS URL (for example: `https://curatech-hospital.web.app`). Your hospital & pharmacy ERP is now live 24/7 online for free!

---

## 6. Using Online on Desktop & Mobile Phones

- **Computer / Billing Counter**: Open `https://YOUR_PROJECT_ID.web.app` in Chrome/Edge. Connect an 80mm thermal printer or A4 printer; clicking **Print Receipt** or **Print / PDF** uses crisp built-in print styles.
- **Mobile Phone / Tablet**:
  - Open the same HTTPS URL in Chrome (Android) or Safari (iPhone).
  - Tap the browser menu -> **Add to Home Screen** (Android) or **Share -> Add to Home Screen** (iOS) to run it full-screen like a native app!
  - Tabs and ribbon bars swipe horizontally, and you can tap **Ribbon** in the top header to collapse/expand the toolbar for maximum mobile workspace area.
- **Auto-Logout Behavior**: Closing the browser tab or window automatically terminates the session (`browserSessionPersistence` + `sessionStorage`), so the next person opening the link must sign in again. You can also set the inactivity timeout (e.g., 15 minutes) or enable strict tab-switch logout under **Admin -> System Settings**.

---

## 7. How to Update, Fix Errors & Maintain in the Future

- **To make an edit**: Open the file in VS Code (for example, `public/js/ribbon-config.js` to add a button, or `public/css/variables.css` to tweak colors), save (`Ctrl+S`), test locally with Live Server, then run:
  ```bash
  git add .
  git commit -m "Describe your update"
  git push
  firebase deploy
  ```
- **Common Error Fixes**:
  1. *"Loading module script failed / CORS error when double-clicking `index.html`"*: Never open `index.html` directly as `file:///`. Always use VS Code **Live Server**, `npm start`, or your live `https://...web.app` URL.
  2. *"Missing or insufficient permissions" in Firestore*: Make sure you deployed `firestore.rules` (`firebase deploy --only firestore:rules`) and logged in as an active user whose document exists in Firestore `users/{uid}` with `active: true`.
  3. *"New user login fails with username"*: Verify the user was created via **Admin -> User Management** (which creates both the Auth user and the `usernames/{username}` lookup document).
  4. **Browser shows old version after deploy**: Press `Ctrl + Shift + R` (hard refresh) to load the newest deployed files.
