import type { VaultSnapshot } from "./types";

const KEY = "tyria-ledger.vault-cache";
const MAX_AGE = 15 * 60 * 1000;

type Envelope = { at: number; snapshot: VaultSnapshot };

export function readVaultCache(): VaultSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope;
    if (!parsed?.snapshot?.locations) return null;
    if (Date.now() - parsed.at > MAX_AGE) return parsed.snapshot;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function writeVaultCache(snapshot: VaultSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), snapshot }));
  } catch {
    /* quota */
  }
}

export function clearVaultCache(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
