/**
 * Unified Data Engine (Firebase Cloud Firestore + Local Sandbox Fallback)
 * -----------------------------------------------------------------------
 * Automatically uses Cloud Firestore when firebase-config.js is filled in,
 * or LocalStorage sandbox mode when running out-of-the-box before setup.
 */
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { INITIAL_SANDBOX_USERS, buildSampleSeedCollections } from "./seed-data.js";

const SANDBOX_STORAGE_KEY = "curatech_erp_sandbox_v2";
const FIREBASE_CDN = "https://www.gstatic.com/firebasejs/10.14.1";

let firebaseContext = null;
const collectionListeners = new Map();
const sandboxCache = {};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadSandboxStore() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  const initial = {
    users: [...INITIAL_SANDBOX_USERS],
    ...buildSampleSeedCollections(todayISO()),
    sequences: { CTH: 1003, OP: 2, IP: 1, LAB: 1, PHB: 1, GRN: 1, CSH: 2, EXP: 1, AUD: 1 }
  };
  localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveSandboxStore(store) {
  localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
}

function notifySubscribers(colName, items) {
  const subs = collectionListeners.get(colName);
  if (!subs) return;
  subs.forEach((cb) => {
    try { cb(items); } catch (e) { console.error("Subscriber error:", e); }
  });
}

export async function initDatabase() {
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    Object.assign(sandboxCache, store);
    return { mode: "sandbox", firebase: null };
  }

  if (firebaseContext) return { mode: "firebase", firebase: firebaseContext };

  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${FIREBASE_CDN}/firebase-app.js`),
    import(`${FIREBASE_CDN}/firebase-auth.js`),
    import(`${FIREBASE_CDN}/firebase-firestore.js`)
  ]);

  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  await authMod.setPersistence(auth, authMod.browserSessionPersistence);
  const db = fsMod.getFirestore(app);

  firebaseContext = { app, auth, db, appMod, authMod, fsMod };
  return { mode: "firebase", firebase: firebaseContext };
}

export function getMode() {
  return isFirebaseConfigured() ? "firebase" : "sandbox";
}

export function getFirebaseContext() {
  return firebaseContext;
}

export async function list(colName) {
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    return [...(store[colName] || [])];
  }
  const { db, fsMod } = firebaseContext;
  const snap = await fsMod.getDocs(fsMod.collection(db, colName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getById(colName, id) {
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    return (store[colName] || []).find((r) => r.id === id) || null;
  }
  const { db, fsMod } = firebaseContext;
  const snap = await fsMod.getDoc(fsMod.doc(db, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function add(colName, record) {
  const now = new Date().toISOString();
  const payload = { ...record, createdAt: record.createdAt || now, updatedAt: now };

  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    if (!store[colName]) store[colName] = [];
    const id = payload.id || `${colName.slice(0, 3).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const item = { ...payload, id };
    store[colName].unshift(item);
    saveSandboxStore(store);
    notifySubscribers(colName, [...store[colName]]);
    return item;
  }

  const { db, fsMod } = firebaseContext;
  if (payload.id) {
    await fsMod.setDoc(fsMod.doc(db, colName, payload.id), payload);
    return payload;
  }
  const ref = await fsMod.addDoc(fsMod.collection(db, colName), payload);
  return { ...payload, id: ref.id };
}

export async function set(colName, id, record) {
  const payload = { ...record, id, updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    if (!store[colName]) store[colName] = [];
    const idx = store[colName].findIndex((r) => r.id === id);
    if (idx >= 0) store[colName][idx] = payload;
    else store[colName].unshift(payload);
    saveSandboxStore(store);
    notifySubscribers(colName, [...store[colName]]);
    return payload;
  }
  const { db, fsMod } = firebaseContext;
  await fsMod.setDoc(fsMod.doc(db, colName, id), payload, { merge: true });
  return payload;
}

export async function update(colName, id, patch) {
  const mergedPatch = { ...patch, updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    const listArr = store[colName] || [];
    const idx = listArr.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`Record ${id} not found in ${colName}`);
    listArr[idx] = { ...listArr[idx], ...mergedPatch };
    saveSandboxStore(store);
    notifySubscribers(colName, [...listArr]);
    return listArr[idx];
  }
  const { db, fsMod } = firebaseContext;
  await fsMod.updateDoc(fsMod.doc(db, colName, id), mergedPatch);
  return getById(colName, id);
}

export async function remove(colName, id) {
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    store[colName] = (store[colName] || []).filter((r) => r.id !== id);
    saveSandboxStore(store);
    notifySubscribers(colName, [...store[colName]]);
    return true;
  }
  const { db, fsMod } = firebaseContext;
  await fsMod.deleteDoc(fsMod.doc(db, colName, id));
  return true;
}

export function subscribe(colName, callback) {
  if (!isFirebaseConfigured()) {
    if (!collectionListeners.has(colName)) collectionListeners.set(colName, new Set());
    collectionListeners.get(colName).add(callback);
    list(colName).then(callback);
    return () => collectionListeners.get(colName)?.delete(callback);
  }
  const { db, fsMod } = firebaseContext;
  return fsMod.onSnapshot(fsMod.collection(db, colName), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function nextSequence(prefix) {
  const year = new Date().getFullYear();
  if (!isFirebaseConfigured()) {
    const store = loadSandboxStore();
    if (!store.sequences) store.sequences = {};
    const next = (store.sequences[prefix] || 0) + 1;
    store.sequences[prefix] = next;
    saveSandboxStore(store);
    return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
  }
  const { db, fsMod } = firebaseContext;
  const seqRef = fsMod.doc(db, "settings", "sequences");
  const snap = await fsMod.getDoc(seqRef);
  const data = snap.exists() ? snap.data() : {};
  const defaultStart = prefix === "CTH" ? 1003 : 0;
  const next = (Number(data[prefix]) || defaultStart) + 1;
  await fsMod.setDoc(seqRef, { [prefix]: next }, { merge: true });
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export async function getHospitalSettings() {
  const cfg = await getById("settings", "hospital_config");
  return cfg || buildSampleSeedCollections(todayISO()).settings[0];
}

export async function saveHospitalSettings(newCfg) {
  return set("settings", "hospital_config", newCfg);
}

export async function seedFirestoreSampleData() {
  const seed = buildSampleSeedCollections(todayISO());
  for (const [colName, docs] of Object.entries(seed)) {
    for (const docItem of docs) {
      await set(colName, docItem.id, docItem);
    }
  }
  return true;
}

export async function resetSandboxDemoData() {
  localStorage.removeItem(SANDBOX_STORAGE_KEY);
  loadSandboxStore();
  return true;
}
