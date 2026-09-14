const META_KEY = "tyria-ledger.key-vault";
const LEGACY_KEY = "tyria-ledger.api-key";
const DB_NAME = "tyria-ledger";
const STORE = "crypto";
const WRAP_ID = "aes-gcm";

export type SavedKeyMeta = {
  name: string;
};

type Envelope = {
  v: 1;
  name: string;
  iv: string;
  ct: string;
};

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB failed"));
  });
}

function idbGet(db: IDBDatabase, id: string): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, id: string, value: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(value, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDel(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let wrapPromise: Promise<CryptoKey> | null = null;

function getOrCreateWrapKey(): Promise<CryptoKey> {
  if (!wrapPromise) {
    wrapPromise = (async () => {
      const db = await openDb();
      try {
        const existing = await idbGet(db, WRAP_ID);
        if (existing) return existing;
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
          "encrypt",
          "decrypt",
        ]);
        await idbPut(db, WRAP_ID, key);
        return key;
      } finally {
        db.close();
      }
    })().catch((err) => {
      wrapPromise = null;
      throw err;
    });
  }
  return wrapPromise;
}

function readEnvelope(): Envelope | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Envelope;
    if (parsed.v !== 1 || !parsed.iv || !parsed.ct) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekSavedKey(): SavedKeyMeta | null {
  const env = readEnvelope();
  if (!env) return null;
  return { name: env.name || "Vault key" };
}

export async function lockApiKey(apiKey: string, name: string): Promise<SavedKeyMeta> {
  const secret = apiKey.trim();
  if (!secret) throw new Error("No API key to save.");
  const wrap = await getOrCreateWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrap, new TextEncoder().encode(secret));
  const env: Envelope = {
    v: 1,
    name: name.trim() || "Vault key",
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
  };
  window.localStorage.setItem(META_KEY, JSON.stringify(env));
  window.localStorage.removeItem(LEGACY_KEY);
  return { name: env.name };
}

export async function unlockApiKey(): Promise<string> {
  const env = readEnvelope();
  if (!env) throw new Error("No saved key.");
  const wrap = await getOrCreateWrapKey();
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(env.iv) },
      wrap,
      b64ToBytes(env.ct),
    );
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("Could not unlock the saved key. Replace it if this keeps happening.");
  }
}

export async function forgetApiKey(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(META_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
  wrapPromise = null;
  try {
    const db = await openDb();
    try {
      await idbDel(db, WRAP_ID);
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

export async function migrateLegacyKey(): Promise<SavedKeyMeta | null> {
  if (typeof window === "undefined") return peekSavedKey();
  const existing = peekSavedKey();
  if (existing) {
    window.localStorage.removeItem(LEGACY_KEY);
    return existing;
  }
  const legacy = window.localStorage.getItem(LEGACY_KEY)?.trim();
  if (!legacy) return null;
  try {
    return await lockApiKey(legacy, "Saved key");
  } catch {
    return null;
  }
}
