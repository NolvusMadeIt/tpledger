import type { PluginPack } from "./types";

const ENABLED_KEY = "tyria-ledger.plugin-enabled";
const SETTINGS_KEY = "tyria-ledger.plugin-settings";
const DB_NAME = "tyria-ledger-plugins";
const STORE = "packs";

export function loadEnabled(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ENABLED_KEY) || "[]") as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEnabled(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, JSON.stringify(ids));
}

export function loadPluginSettings(id: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") as Record<
      string,
      Record<string, unknown>
    >;
    return all[id] ?? {};
  } catch {
    return {};
  }
}

export function savePluginSetting(id: string, key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  const all = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") as Record<
    string,
    Record<string, unknown>
  >;
  all[id] = { ...(all[id] ?? {}), [key]: value };
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listDropped(): Promise<PluginPack[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as PluginPack[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function putDropped(pack: PluginPack): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(pack);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function removeDropped(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
