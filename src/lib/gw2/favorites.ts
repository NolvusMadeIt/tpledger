export type Favorite = {
  id: number;
  name: string;
  icon: string | null;
  rarity: string;
};

const KEY = "tyria-ledger.favorites";

function read(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Favorite[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && Number.isFinite(row.id) && row.name);
  } catch {
    return [];
  }
}

function write(items: Favorite[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
}

export function loadFavorites(): Favorite[] {
  return read();
}

export function saveFavorites(items: Favorite[]): void {
  if (typeof window === "undefined") return;
  write(items);
}
