import { createServerFn } from "@tanstack/react-start";
import { encodeChatlink, parseGameCopy } from "./chatlink";
import { afterTax } from "./money";
import { PULSE_IDS } from "./popular";
import type {
  GemRate,
  ItemInspect,
  ItemQuote,
  ListingRow,
  MarketPulse,
  PulseItem,
  SearchHit,
  VaultLine,
  VaultLocation,
  VaultSnapshot,
} from "./types";

const GW2 = "https://api.guildwars2.com/v2";
const SEARCH = "https://api.datawars2.ie/gw2/v1/items/json";
const UA = "TyriaLedger/1.0";

type Gw2Item = {
  id: number;
  name: string;
  rarity?: string;
  type?: string;
  icon?: string;
  vendor_value?: number;
  flags?: string[];
  chat_link?: string;
  description?: string;
  level?: number;
  details?: { type?: string };
};

type Gw2Price = {
  id: number;
  whitelisted?: boolean;
  buys?: { quantity?: number; unit_price?: number };
  sells?: { quantity?: number; unit_price?: number };
};

type Gw2Listing = {
  id: number;
  buys?: { listings: number; unit_price: number; quantity: number }[];
  sells?: { listings: number; unit_price: number; quantity: number }[];
};

type Slot = { id?: number; count?: number; binding?: string } | null | undefined;

const BOUND_FLAGS = new Set([
  "accountbound",
  "soulbindonacquire",
  "soulboundonacquire",
]);

function isBoundSlot(slot: Slot): boolean {
  const binding = slot?.binding?.toLowerCase();
  return binding === "account" || binding === "character";
}

function isBoundItem(item: Gw2Item | undefined): boolean {
  return (item?.flags ?? []).some((flag) => BOUND_FLAGS.has(flag.toLowerCase()));
}

function canSellOnMarket(item: Gw2Item | undefined, price: Gw2Price | undefined): boolean {
  return Boolean(price) && !isBoundItem(item);
}

const STOP = new Set(["of", "the", "a", "an", "and", "or", "with", "for"]);

function searchTerms(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const terms = [trimmed];
  const words = trimmed.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  const last = words[words.length - 1];
  if (last && last.toLowerCase() !== trimmed.toLowerCase()) terms.push(last);
  return [...new Set(terms)];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function gw2<T>(path: string, key?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${GW2}${path}`, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { text?: string };
      if (body.text) detail = body.text;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

function toListing(rows: Gw2Listing["buys"] | undefined, dir: "buy" | "sell"): ListingRow[] {
  const list = [...(rows ?? [])].sort((a, b) =>
    dir === "buy" ? b.unit_price - a.unit_price : a.unit_price - b.unit_price,
  );
  return list.slice(0, 10).map((r) => ({
    listings: r.listings,
    unitPrice: r.unit_price,
    quantity: r.quantity,
  }));
}

function quoteFrom(item: Gw2Item, price: Gw2Price | undefined, listings: Gw2Listing | null): ItemQuote {
  const buy = price?.buys?.unit_price ?? 0;
  const sell = price?.sells?.unit_price ?? 0;
  return {
    id: item.id,
    name: item.name,
    rarity: item.rarity ?? "Basic",
    type: item.type ?? "Unknown",
    subtype: item.details?.type ?? null,
    icon: item.icon ?? null,
    vendorValue: item.vendor_value ?? 0,
    traded: Boolean(price),
    whitelisted: Boolean(price?.whitelisted),
    buy,
    sell,
    buyQuantity: price?.buys?.quantity ?? 0,
    sellQuantity: price?.sells?.quantity ?? 0,
    instantSell: afterTax(buy),
    listNet: afterTax(sell),
    spread: sell && buy ? sell - buy : 0,
    buys: toListing(listings?.buys, "buy"),
    sells: toListing(listings?.sells, "sell"),
    chatLink: item.chat_link || encodeChatlink(item.id),
  };
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  if (!items.length) return;
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      if (item !== undefined) await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function fetchItems(ids: number[]): Promise<Map<number, Gw2Item>> {
  const map = new Map<number, Gw2Item>();
  const unique = [...new Set(ids.filter((id) => id > 0))];
  await pool(chunk(unique, 200), 4, async (group) => {
    const rows = await gw2<Gw2Item[]>(`/items?ids=${group.join(",")}&lang=en`);
    for (const row of rows) map.set(row.id, row);
  });
  return map;
}

async function fetchPrices(ids: number[]): Promise<Map<number, Gw2Price>> {
  const map = new Map<number, Gw2Price>();
  const unique = [...new Set(ids.filter((id) => id > 0))];

  async function load(group: number[]) {
    if (!group.length) return;
    try {
      const rows = await gw2<Gw2Price[]>(`/commerce/prices?ids=${group.join(",")}`);
      for (const row of rows) map.set(row.id, row);
    } catch {
      if (group.length === 1) return;
      const mid = Math.ceil(group.length / 2);
      await Promise.all([load(group.slice(0, mid)), load(group.slice(mid))]);
    }
  }

  await pool(chunk(unique, 200), 4, load);
  return map;
}

let gemMemo: { at: number; data: GemRate | null } | null = null;

async function readGemRate(): Promise<GemRate | null> {
  if (gemMemo && Date.now() - gemMemo.at < 60_000) return gemMemo.data;
  try {
    const [gems, gold] = await Promise.all([
      gw2<{ quantity: number }>("/commerce/exchange/gems?quantity=100"),
      gw2<{ quantity: number }>("/commerce/exchange/coins?quantity=1000000"),
    ]);
    gemMemo = { at: Date.now(), data: { coinsFor100Gems: gems.quantity, gemsFor100Gold: gold.quantity } };
    return gemMemo.data;
  } catch {
    gemMemo = { at: Date.now(), data: null };
    return null;
  }
}

export const getGemRate = createServerFn({ method: "GET" }).handler(async (): Promise<GemRate | null> => {
  return readGemRate();
});

let pulseMemo: { at: number; data: MarketPulse } | null = null;

export const getMarketPulse = createServerFn({ method: "GET" }).handler(async (): Promise<MarketPulse> => {
  if (pulseMemo && Date.now() - pulseMemo.at < 60_000) return pulseMemo.data;
  const [gems, items, prices] = await Promise.all([
    readGemRate(),
    fetchItems(PULSE_IDS),
    fetchPrices(PULSE_IDS),
  ]);
  const rows: PulseItem[] = [];
  for (const id of PULSE_IDS) {
    const item = items.get(id);
    const price = prices.get(id);
    if (!canSellOnMarket(item, price) || !item || !price) continue;
    const buy = price.buys?.unit_price ?? 0;
    const sell = price.sells?.unit_price ?? 0;
    rows.push({
      id,
      name: item.name,
      icon: item.icon ?? null,
      rarity: item.rarity ?? "Basic",
      buy,
      sell,
      instantSell: afterTax(buy),
      listNet: afterTax(sell),
      buyQuantity: price.buys?.quantity ?? 0,
      sellQuantity: price.sells?.quantity ?? 0,
    });
  }
  const demand = [...rows].sort((a, b) => b.buyQuantity - a.buyQuantity).slice(0, 5);
  const listed = [...rows].sort((a, b) => b.sellQuantity - a.sellQuantity).slice(0, 5);
  const fatSpread =
    [...rows]
      .filter((row) => row.buy > 0 && row.sell > 0)
      .sort((a, b) => b.listNet - b.instantSell - (a.listNet - a.instantSell))[0] ?? null;
  const data: MarketPulse = {
    gems,
    ecto: rows.find((row) => row.id === 19721) ?? null,
    demand,
    listed,
    fatSpread,
  };
  pulseMemo = { at: Date.now(), data };
  return data;
});

export const searchItems = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const q = typeof input === "object" && input && "q" in input ? String((input as { q: unknown }).q) : "";
    return { q: q.trim().slice(0, 80) };
  })
  .handler(async ({ data }): Promise<SearchHit[]> => {
    const q = data.q;
    if (q.length < 2) return [];
    const parsed = parseGameCopy(q);
    const queries = parsed.id ? [String(parsed.id)] : parsed.candidates.flatMap(searchTerms);
    const needle = parsed.search.toLowerCase();
    const tokens = needle.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

    const hits: SearchHit[] = [];
    const seen = new Set<number>();

    async function addById(id: number) {
      if (seen.has(id)) return;
      try {
        const items = await gw2<Gw2Item[]>(`/items?ids=${id}&lang=en`);
        const prices = await fetchPrices([id]);
        const item = items[0];
        if (!item || isBoundItem(item)) return;
        seen.add(item.id);
        const p = prices.get(item.id);
        if (!p) return;
        hits.push({
          id: item.id,
          name: item.name,
          rarity: item.rarity ?? "",
          type: item.type ?? "",
          buy: p?.buys?.unit_price ?? 0,
          sell: p?.sells?.unit_price ?? 0,
          chatLink: item.chat_link || encodeChatlink(item.id),
        });
      } catch {
        /* ignore */
      }
    }

    if (parsed.id) await addById(parsed.id);

    await Promise.all(
      queries.map(async (term) => {
        if (/^\d+$/.test(term)) {
          await addById(Number(term));
          return;
        }
        if (term.length < 2) return;
        try {
          const url = `${SEARCH}?filter=name:cts:${encodeURIComponent(term)}&fields=id,name,rarity,type,buy_price,sell_price&limit=40`;
          const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
          if (!res.ok) return;
          const rows = (await res.json()) as {
            id: number;
            name?: string;
            rarity?: string;
            type?: string;
            buy_price?: number;
            sell_price?: number;
          }[];
          for (const row of rows) {
            if (seen.has(row.id)) continue;
            if (!(row.buy_price || row.sell_price)) continue;
            seen.add(row.id);
            hits.push({
              id: row.id,
              name: row.name ?? `#${row.id}`,
              rarity: row.rarity ?? "",
              type: row.type ?? "",
              buy: row.buy_price ?? 0,
              sell: row.sell_price ?? 0,
              chatLink: encodeChatlink(row.id),
            });
          }
        } catch {
          /* search index optional */
        }
      }),
    );
    hits.sort((a, b) => {
      const rank = (name: string) => {
        const n = name.toLowerCase();
        if (parsed.candidates.some((c) => c.toLowerCase() === n)) return 0;
        if (n === needle) return 0;
        const words = n.split(/\s+/);
        if (tokens.length && tokens.every((t) => words.includes(t))) return 1;
        if (parsed.candidates.some((c) => n.startsWith(c.toLowerCase()))) return 2;
        if (n.startsWith(needle)) return 2;
        return 3;
      };
      const ae = rank(a.name);
      const be = rank(b.name);
      if (ae !== be) return ae - be;
      return (b.sell || 0) - (a.sell || 0);
    });
    return hits.slice(0, 20);
  });

export const checkItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof input === "object" && input && "id" in input ? Number((input as { id: unknown }).id) : 0;
    if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid item id");
    return { id: Math.floor(id) };
  })
  .handler(async ({ data }): Promise<ItemQuote> => {
    const items = await gw2<Gw2Item[]>(`/items?ids=${data.id}&lang=en`);
    const item = items[0];
    if (!item) throw new Error("Unknown item");
    let price: Gw2Price | undefined;
    let listings: Gw2Listing | null = null;
    try {
      const prices = await gw2<Gw2Price[]>(`/commerce/prices?ids=${data.id}`);
      price = prices[0];
    } catch {
      price = undefined;
    }
    try {
      listings = await gw2<Gw2Listing>(`/commerce/listings/${data.id}`);
    } catch {
      listings = null;
    }
    return quoteFrom(item, price, listings);
  });

export const inspectItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = typeof input === "object" && input && "id" in input ? Number((input as { id: unknown }).id) : 0;
    if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid item id");
    return { id: Math.floor(id) };
  })
  .handler(async ({ data }): Promise<ItemInspect> => {
    const items = await gw2<Gw2Item[]>(`/items?ids=${data.id}&lang=en`);
    const item = items[0];
    if (!item) throw new Error("Unknown item");
    let price: Gw2Price | undefined;
    try {
      const prices = await gw2<Gw2Price[]>(`/commerce/prices?ids=${data.id}`);
      price = prices[0];
    } catch {
      price = undefined;
    }
    const buy = price?.buys?.unit_price ?? 0;
    const sell = price?.sells?.unit_price ?? 0;
    return {
      id: item.id,
      name: item.name,
      icon: item.icon ?? null,
      rarity: item.rarity ?? "Basic",
      type: item.type ?? "Unknown",
      subtype: item.details?.type ?? null,
      description: stripMarkup(item.description ?? ""),
      level: item.level ?? 0,
      chatLink: item.chat_link || encodeChatlink(item.id),
      traded: Boolean(price),
      buy,
      sell,
      instantSell: afterTax(buy),
      listNet: afterTax(sell),
      vendorValue: item.vendor_value ?? 0,
    };
  });

function stripMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/"/g, '"')
    .replace(/&/g, "&")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function pushSlot(bucket: Map<string, Map<number, number>>, loc: string, slot: Slot) {
  if (!slot?.id || isBoundSlot(slot)) return;
  const n = slot.count ?? 1;
  if (n <= 0) return;
  let inner = bucket.get(loc);
  if (!inner) {
    inner = new Map();
    bucket.set(loc, inner);
  }
  inner.set(slot.id, (inner.get(slot.id) ?? 0) + n);
}

export const loadVault = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const apiKey =
      typeof input === "object" && input && "apiKey" in input ? String((input as { apiKey: unknown }).apiKey).trim() : "";
    if (apiKey.length < 8) throw new Error("Paste a Guild Wars 2 API key.");
    return { apiKey };
  })
  .handler(async ({ data }): Promise<VaultSnapshot> => {
    const key = data.apiKey;
    const token = await gw2<{ name?: string; permissions?: string[] }>("/tokeninfo", key);
    const permissions = token.permissions ?? [];
    const missing: string[] = [];
    if (!permissions.includes("account")) missing.push("account");
    if (!permissions.includes("inventories")) missing.push("inventories");
    if (missing.length) {
      throw new Error(`This key is missing: ${missing.join(", ")}. Add those permissions at account.arena.net.`);
    }

    const account = await gw2<{ name?: string }>("/account", key);
    const [bank, materials, shared] = await Promise.all([
      gw2<Slot[]>("/account/bank", key),
      gw2<Slot[]>("/account/materials", key),
      gw2<Slot[]>("/account/inventory", key),
    ]);

    const bucket = new Map<string, Map<number, number>>();
    const labels = new Map<string, { label: string; kind: VaultLocation["kind"] }>();
    labels.set("bank", { label: "Bank", kind: "bank" });
    labels.set("materials", { label: "Mats", kind: "materials" });
    labels.set("shared", { label: "Shared", kind: "shared" });

    for (const slot of bank) pushSlot(bucket, "bank", slot);
    for (const slot of materials) pushSlot(bucket, "materials", slot);
    for (const slot of shared) pushSlot(bucket, "shared", slot);

    if (permissions.includes("characters")) {
      try {
        type Char = {
          name: string;
          bags?: ({ inventory?: Slot[] } | null)[];
        };
        const chars = await gw2<Char[]>("/characters?ids=all", key);
        for (const ch of chars) {
          const loc = `char:${ch.name}`;
          labels.set(loc, { label: ch.name, kind: "character" });
          for (const bag of ch.bags ?? []) {
            for (const slot of bag?.inventory ?? []) pushSlot(bucket, loc, slot);
          }
        }
      } catch {
        /* characters optional */
      }
    }

    const allIds: number[] = [];
    for (const inner of bucket.values()) allIds.push(...inner.keys());
    const items = await fetchItems(allIds);
    const marketIds = [...new Set(allIds.filter((id) => !isBoundItem(items.get(id))))];
    const prices = await fetchPrices(marketIds);

    const locations: VaultLocation[] = [];
    let instantSell = 0;
    let listNet = 0;
    let replaceCost = 0;
    let vendor = 0;
    let count = 0;
    let untraded = 0;
    const unique = new Set<number>();

    for (const [locId, inner] of bucket) {
      const meta = labels.get(locId) ?? { label: locId, kind: "bank" as const };
      const locItems: VaultLine[] = [];
      for (const [id, n] of inner) {
        const item = items.get(id);
        const price = prices.get(id);
        if (!canSellOnMarket(item, price)) continue;
        const buy = price?.buys?.unit_price ?? 0;
        const sell = price?.sells?.unit_price ?? 0;
        const traded = Boolean(price);
        const line: VaultLine = {
          id,
          name: item?.name ?? `Item ${id}`,
          icon: item?.icon ?? null,
          rarity: item?.rarity ?? "Basic",
          type: item?.type ?? "",
          count: n,
          buy,
          sell,
          vendor: item?.vendor_value ?? 0,
          traded,
          instantSell: afterTax(buy),
          listNet: afterTax(sell),
          buyQuantity: price?.buys?.quantity ?? 0,
          sellQuantity: price?.sells?.quantity ?? 0,
        };
        locItems.push(line);
        unique.add(id);
        count += n;
        instantSell += line.instantSell * n;
        listNet += line.listNet * n;
        replaceCost += sell * n;
        vendor += line.vendor * n;
        if (!traded) untraded += n;
      }
      locItems.sort((a, b) => b.instantSell * b.count - a.instantSell * a.count);
      if (locItems.length) {
        locations.push({ id: locId, label: meta.label, kind: meta.kind, items: locItems });
      }
    }

    const order = { bank: 0, materials: 1, shared: 2, character: 3 };
    locations.sort((a, b) => order[a.kind] - order[b.kind] || a.label.localeCompare(b.label));

    return {
      accountName: account.name ?? "Account",
      keyName: token.name ?? "API key",
      permissions,
      missing: permissions.includes("characters") ? [] : ["characters"],
      locations,
      totals: {
        count,
        unique: unique.size,
        instantSell,
        listNet,
        replaceCost,
        vendor,
        untraded,
      },
    };
  });
