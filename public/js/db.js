/**
 * Unified Realtime Database Layer
 * Automatically connects to Firebase Cloud Firestore (Free Spark Tier) when
 * configured, or runs seamlessly on Local Offline Sandbox storage until configured.
 */
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { INITIAL_SANDBOX_USERS, buildSampleSeedCollections } from "./seed-data.js";

const SANDBOX_STORAGE_KEY = "guruhospital_nalam_sandbox_v1";
const collectionListeners = new Map();

let firebaseContext = null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadSandboxStore() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Re-initialize on corrupt JSON
  }

  const seed = buildSampleSeedCollections(todayISO());
  const initial = {
    users: [...INITIAL_SANDBOX_USERS],
    sequences: { GH: 1003, OP: 102, IP: 1, RX: 1, PHB: 1, GRN: 1, LAB: 1, INV: 2, CERT: 0, GP: 0, DOC: 0 },
    ...seed
  };
  saveSandboxStore(initial);
  return initial;
}

function saveSandboxStore(store) {
  localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
}

function notifySubscribers(colName, docs) {
  const subs = collectionListeners.get(colName);
  if (!subs) return;
  subs.forEach((cb) => {
    try {
      cb(docs);
    } catch (e) {
      console.error("Subscriber callback error:", e);
    }
  });
}

export async function initDatabase() {
  if (!isFirebaseConfigured()) {
    loadSandboxStore();
    return { mode: "sandbox" };
  }

  const [appMod, authMod, fsMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
  ]);

  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  // Enforce session-only authentication so closing/exiting logs out automatically
  await authMod.setPersistence(auth, authMod.browserSessionPersistence);
  const db = fsMod.getFirestore(app);

  firebaseContext = { app, auth, db, appMod, authMod, fsMod };
  return { mode: "firebase", ...firebaseContext };
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
  const defaultStart = prefix === "GH" ? 1003 : 0;
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
