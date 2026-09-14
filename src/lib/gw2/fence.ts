import type { VaultLine, VaultLocation, VaultSnapshot } from "./types";

export type FenceHome = {
  label: string;
  kind: VaultLocation["kind"];
  count: number;
};

export type FenceStack = VaultLine & { dump: number; list: number; homes: FenceHome[] };

export type FenceTip = {
  id: number;
  name: string;
  icon: string | null;
  rarity: string;
  count: number;
  amount: number;
  note: string;
  homes: FenceHome[];
};

export type FenceBrief = {
  dumpTotal: number;
  listTotal: number;
  patience: number;
  flipBook: number;
  holdings: FenceTip[];
  listThese: FenceTip[];
  flips: FenceTip[];
  traps: FenceTip[];
  dead: FenceTip[];
  secrets: string[];
};

function homeLabel(loc: VaultLocation): string {
  if (loc.kind === "bank") return "Bank";
  if (loc.kind === "materials") return "Mats";
  if (loc.kind === "shared") return "Shared";
  return loc.label;
}

function merge(snapshot: VaultSnapshot): FenceStack[] {
  const map = new Map<number, FenceStack>();
  for (const loc of snapshot.locations) {
    for (const item of loc.items) {
      const prev = map.get(item.id);
      const home: FenceHome = { label: homeLabel(loc), kind: loc.kind, count: item.count };
      if (prev) {
        prev.count += item.count;
        prev.dump = prev.instantSell * prev.count;
        prev.list = prev.listNet * prev.count;
        const existing = prev.homes.find((row) => row.label === home.label && row.kind === home.kind);
        if (existing) existing.count += home.count;
        else prev.homes.push(home);
      } else {
        map.set(item.id, {
          ...item,
          dump: item.instantSell * item.count,
          list: item.listNet * item.count,
          homes: [home],
        });
      }
    }
  }
  return [...map.values()].map((row) => ({
    ...row,
    homes: [...row.homes].sort((a, b) => b.count - a.count),
  }));
}

function tip(
  s: FenceStack,
  amount: number,
  note: string,
): FenceTip {
  return {
    id: s.id,
    name: s.name,
    icon: s.icon,
    rarity: s.rarity,
    count: s.count,
    amount,
    note,
    homes: s.homes,
  };
}

export function appraiseVault(snapshot: VaultSnapshot, query = ""): FenceBrief {
  const q = query.trim().toLowerCase();
  let stacks = merge(snapshot);
  if (q) {
    stacks = stacks.filter((s) => s.name.toLowerCase().includes(q) || String(s.id) === q);
  }

  const dumpTotal = stacks.reduce((n, s) => n + s.dump, 0);
  const listTotal = stacks.reduce((n, s) => n + s.list, 0);
  const patience = Math.max(0, listTotal - dumpTotal);

  const holdings = [...stacks]
    .sort((a, b) => b.dump - a.dump)
    .filter((s) => s.dump > 0)
    .slice(0, 8)
    .map((s) => {
      const share = dumpTotal ? Math.round((s.dump / dumpTotal) * 100) : 0;
      return tip(
        s,
        s.dump,
        share >= 8 ? `${share}% of a dump. This is the bag.` : "Worth moving. Not the whole story.",
      );
    });

  const listThese = [...stacks]
    .map((s) => ({ s, extra: s.list - s.dump }))
    .filter(({ s, extra }) => s.traded && extra >= 10000 && s.sell > s.buy)
    .sort((a, b) => b.extra - a.extra)
    .slice(0, 8)
    .map(({ s, extra }) =>
      tip(
        s,
        extra,
        s.buyQuantity >= 500
          ? "Buy wall is thick — dumping is easy, listing pays more."
          : "Thin demand. Don't eat the buy order; list it.",
      ),
    );

  const flips = [...stacks]
    .map((s) => {
      const each = s.listNet - s.buy;
      const thin = s.buyQuantity < 80 || s.sellQuantity < 80;
      return { s, each, thin };
    })
    .filter(({ s, each }) => s.traded && s.buy > 0 && s.sell > 0 && each >= 50)
    .sort((a, b) => b.each * Math.min(b.s.count, 250) - a.each * Math.min(a.s.count, 250))
    .slice(0, 8)
    .map(({ s, each, thin }) =>
      tip(
        s,
        each,
        thin
          ? `Edge is ${formatCopper(each)} each after tax, but the book is thin. Small clips only.`
          : `Bid the buy, undercut the sell. ${formatCopper(each)} each after the 15%.`,
      ),
    );

  const traps = [...stacks]
    .map((s) => ({ s, gross: s.sell - s.buy, net: s.listNet - s.buy }))
    .filter(({ s, gross, net }) => s.traded && s.buy > 0 && gross >= Math.max(50, s.buy * 0.04) && net <= 0)
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 6)
    .map(({ s, gross }) => tip(s, gross, "Looks like a spread. Tax eats it. Do not buy these to relist."));

  const dead = [...stacks]
    .filter((s) => !s.traded || (s.buy <= 0 && s.sell <= 0))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((s) =>
      tip(
        s,
        s.vendor * s.count,
        s.vendor > 0 ? "No TP. Vendor if you need the slot." : "No TP and no vendor. Keep or destroy.",
      ),
    );

  const topShare = dumpTotal
    ? holdings.slice(0, 3).reduce((n, h) => n + h.amount, 0) / dumpTotal
    : 0;

  const secrets: string[] = [
    "Never instant-buy to instant-sell. The 15% is a listing fee plus an exchange fee. That path is a donation.",
    patience >= 10000
      ? `Patience on this vault is worth ${formatCopper(patience)} — listing at current sell vs dumping into buy orders.`
      : "Spreads here are tight. Dumping is fine; listing won't change your life.",
  ];

  if (topShare >= 0.45 && holdings.length >= 2) {
    secrets.push(
      `Three names hold ${Math.round(topShare * 100)}% of a dump. Everything else is noise until those move.`,
    );
  }
  if (flips.length) {
    secrets.push(
      `${flips[0].name} still has an after-tax edge. Bid, don't lift the sell — lifting pays the taxman.`,
    );
  } else {
    secrets.push("Nothing in here is a clean flip after tax. Sell what you own; don't restock the spread.");
  }
  if (listThese.length) {
    secrets.push(`If you only list one stack, list ${listThese[0].name}. That's the extra gold for waiting.`);
  }

  const flipBook = flips.reduce((n, f) => n + f.amount * Math.min(f.count, 50), 0);

  return {
    dumpTotal,
    listTotal,
    patience,
    flipBook,
    holdings,
    listThese,
    flips,
    traps,
    dead,
    secrets,
  };
}

function formatCopper(n: number): string {
  const v = Math.max(0, Math.floor(n));
  const g = Math.floor(v / 10000);
  const s = Math.floor((v % 10000) / 100);
  const c = v % 100;
  if (g > 0) return `${g}g ${s}s`;
  if (s > 0) return `${s}s ${c}c`;
  return `${c}c`;
}
