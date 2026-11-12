const DB_NAME = "notch_capture_db";
const STORE_NAME = "captures";
const DB_VERSION = 1;

function openCaptureDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "quoteId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadLocalCapture(quoteId) {
  const db = await openCaptureDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(quoteId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalCapture(record) {
  const db = await openCaptureDb();
  if (!db) return record;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const next = { ...record, updatedAt: Date.now() };
    const req = tx.objectStore(STORE_NAME).put(next);
    req.onsuccess = () => resolve(next);
    req.onerror = () => reject(req.error);
  });
}

export async function clearLocalCapture(quoteId) {
  const db = await openCaptureDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(quoteId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}