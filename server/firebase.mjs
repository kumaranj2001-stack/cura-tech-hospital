import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { config } from "./config.mjs";

export const firebaseConfig = config.firebase;

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;

export const COLLECTIONS = {
  branches: "gp_branches",
  users: "gp_users",
  medicines: "gp_medicines",
  patients: "gp_patients",
  doctors: "gp_doctors",
  invoices: "gp_invoices",
  suppliers: "gp_suppliers",
  grns: "gp_grns",
  returns: "gp_returns",
  audit: "gp_audit",
  meta: "gp_meta",
  appointments: "gp_appointments",
  admissions: "gp_admissions",
  vitals: "gp_vitals",
  carePlans: "gp_care_plans",
  consultations: "gp_consultations",
  labOrders: "gp_lab_orders",
  certificates: "gp_certificates",
  equipments: "gp_equipments",
  accounts: "gp_accounts",
  cashier: "gp_cashier",
  physiotherapy: "gp_physiotherapy",
  store: "gp_store",
  ambulance: "gp_ambulance",
  skin: "gp_skin",
  maintenance: "gp_maintenance",
  admin: "gp_admin",
  lab: "gp_lab",
};
