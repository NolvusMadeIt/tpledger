import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins } from "@/components/coins";
import { FavoriteStar } from "@/components/favorites";
import { Inspectable } from "@/components/item-tooltip";
import { MarketDesk } from "@/components/market-desk";
import { RarityLabel } from "@/components/rarity";
import { checkItem, searchItems } from "@/lib/gw2/functions";
import { encodeChatlink, parseGameCopy } from "@/lib/gw2/chatlink";
import { emitPluginEvent } from "@/lib/plugins/bus";
import type { ItemQuote, SearchHit } from "@/lib/gw2/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <AppShell>
      <PriceCheck />
    </AppShell>
  );
}

function PriceCheck() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<ItemQuote | null>(null);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    const value = q.trim();
    const parsed = parseGameCopy(value);
    const selected =
      Boolean(quote) &&
      (parsed.id === quote?.id ||
        value.toLowerCase() === quote?.name.toLowerCase() ||
        value === quote?.chatLink);
    if (selected || value.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(() => {
      void runSearch(value, false);
    }, 220);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q, quote?.id, quote?.name, quote?.chatLink]);

  async function runSearch(value: string, autoFirst: boolean) {
    setStatus("");
    const parsed = parseGameCopy(value);
    try {
      const rows = await searchItems({ data: { q: value } });
      setHits(rows);
      const exact = rows.find((hit) =>
        parsed.candidates.some((c) => c.toLowerCase() === hit.name.toLowerCase()),
      );
      if (parsed.fromBrackets && (autoFirst || exact)) {
        const hit = exact ?? rows[0];
        if (hit) {
          await load(hit.id, parsed.quantity, true);
          return;
        }
      }
      setOpen(rows.length > 0);
      if (!rows.length) setStatus(`No items named “${parsed.search}”.`);
      if (autoFirst && rows[0]) await load(rows[0].id, parsed.quantity, parsed.fromBrackets);
    } catch (err) {
      setHits([]);
      setOpen(false);
      setStatus(err instanceof Error ? err.message : "Search failed.");
    }
  }

  async function load(id: number, quantity = 1, asCode = false) {
    setBusy(true);
    setOpen(false);
    setHits([]);
    setStatus("");
    try {
      const result = await checkItem({ data: { id } });
      setQuote(result);
      emitPluginEvent("item:checked", result);
      setQty(Math.max(1, quantity));
      setQ(asCode ? encodeChatlink(result.id, quantity) : result.name);
    } catch (err) {
      setQuote(null);
      setStatus(err instanceof Error ? err.message : "Could not load this item.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(rawValue?: string) {
    const raw = (rawValue ?? q).trim();
    if (!raw) return;
    const parsed = parseGameCopy(raw);
    if (parsed.id) {
      await load(parsed.id, parsed.quantity, parsed.fromBrackets);
      return;
    }
    await runSearch(raw, true);
  }

  const n = Math.max(1, qty || 1);
  const flip = quote ? quote.listNet - quote.sell : 0;

  return (
    <div>
      <div className="gw2-banner mb-6 px-4 py-3">
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Price check</h1>
        <p className="mt-1 text-sm text-foreground/80">
          Live buy and sell from the TP. Tax is 15%. Paste a name, item ID, chat code, or an in-game copy like [4 Heads of Cabbage].
        </p>
      </div>

      <div className="relative" ref={box}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                if (!hits.length || !q.trim()) return;
                if (quote && q.trim().toLowerCase() === quote.name.toLowerCase()) return;
                if (quote && parseGameCopy(q).id === quote.id) return;
                setOpen(true);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim();
                if (!text) return;
                if (text.includes("[") || text.includes("#")) {
                  e.preventDefault();
                  setQ(text);
                  void submit(text);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="[4 Heads of Cabbage], 19721, or [&AgE…]"
              className={cn("pl-10", q && "pr-10")}
              autoFocus
              id="item-search"
              aria-label="Search items"
              aria-expanded={open}
              aria-controls="search-hits"
            />
            {q ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQ("");
                  setHits([]);
                  setOpen(false);
                  setQuote(null);
                  setStatus("");
                }}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Checking…" : "Check"}
          </Button>
        </div>
        {open && hits.length > 0 ? (
          <div
            id="search-hits"
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
            style={{ maxHeight: "14rem" }}
          >
            {hits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                role="option"
                onClick={() => void load(hit.id, parseGameCopy(q).quantity, parseGameCopy(q).fromBrackets)}
                className="grid w-full grid-cols-[1fr_auto_auto] gap-4 border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-secondary/70"
              >
                <span>
                  <span className="block truncate text-sm">{hit.name}</span>
                  <span className="text-xs text-muted-foreground">
                    <RarityLabel rarity={hit.rarity} /> · {hit.type} · #{hit.id}
                  </span>
                </span>
                <Coins copper={hit.buy} size="sm" />
                <Coins copper={hit.sell} size="sm" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {status ? <p className="mt-4 text-sm text-sell">{status}</p> : null}

      {quote ? (
        <article className="gw2-well mt-8 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <Inspectable itemId={quote.id} className="flex min-w-0 flex-1 items-start gap-4 p-1">
              {quote.icon ? (
                <img
                  src={quote.icon}
                  alt=""
                  className="size-16 rounded-xl bg-secondary object-contain"
                />
              ) : (
                <div className="size-16 rounded-xl bg-secondary" />
              )}
              <div className="min-w-0">
                <h2 className="font-display text-3xl tracking-tight text-foreground">{quote.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <RarityLabel rarity={quote.rarity} /> · {quote.type}
                  {quote.subtype ? ` / ${quote.subtype}` : ""} · ID {quote.id}
                  {quote.whitelisted ? " · F2P whitelist" : ""}
                </p>
              </div>
            </Inspectable>
            <FavoriteStar
              item={{ id: quote.id, name: quote.name, icon: quote.icon, rarity: quote.rarity }}
            />
          </div>

          {!quote.traded ? (
            <p className="mt-6 text-sm text-sell">This item is not listed on the TP.</p>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Stat
                  label="Instant buy"
                  hint="Lowest sell listing"
                  value={quote.sell * n}
                  tone="sell"
                  extra={`Supply ${quote.sellQuantity.toLocaleString()}`}
                />
                <Stat
                  label="Instant sell"
                  hint="Highest buy order, minus 15%"
                  value={quote.instantSell * n}
                  tone="buy"
                  extra={`Demand ${quote.buyQuantity.toLocaleString()}`}
                />
                <Stat
                  label="List at current sell"
                  hint="Net after 15% if it sells there"
                  value={quote.listNet * n}
                  extra={`Fees ${formatHint(quote.sell - quote.listNet, n)}`}
                />
                <Stat
                  label="Buy now, relist here"
                  hint="Usually negative — the spread is the tax"
                  value={Math.abs(flip) * n}
                  signed={flip}
                  extra={`Spread ${formatHint(quote.spread, n)}`}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <label className="flex items-center gap-2">
                  Qty
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-20"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <Book title="Buy orders" rows={quote.buys} tone="buy" />
                <Book title="Sell listings" rows={quote.sells} tone="sell" />
              </div>
            </>
          )}
        </article>
      ) : (
        <MarketDesk
          onPick={(id, name) => {
            setQ(name);
            void load(id);
          }}
        />
      )}
    </div>
  );
}

function formatHint(unit: number, n: number) {
  const { g, s, c } = {
    g: Math.floor((unit * n) / 10000),
    s: Math.floor(((unit * n) % 10000) / 100),
    c: (unit * n) % 100,
  };
  return `${g}g ${s}s ${c}c`;
}

function Stat({
  label,
  hint,
  value,
  extra,
  tone,
  signed,
}: {
  label: string;
  hint: string;
  value: number;
  extra?: string;
  tone?: "buy" | "sell";
  signed?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className={cn("mt-2", tone === "buy" && "text-buy", tone === "sell" && "text-sell")}>
        {signed !== undefined ? (
          <span className="mr-1 text-sm">{signed >= 0 ? "+" : "−"}</span>
        ) : null}
        <Coins copper={value} size="lg" className={cn(tone === "buy" && "text-buy", tone === "sell" && "text-sell")} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      {extra ? <p className="mt-1 text-xs text-muted-foreground">{extra}</p> : null}
    </div>
  );
}

function Book({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ItemQuote["buys"];
  tone: "buy" | "sell";
}) {
  return (
    <div>
      <h3 className={cn("mb-2 text-sm font-medium", tone === "buy" ? "text-buy" : "text-sell")}>{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Price</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Lists</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-3 text-muted-foreground">
                No orders
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={`${row.unitPrice}-${i}`} className="border-t border-border">
                <td className="py-2">
                  <Coins copper={row.unitPrice} size="sm" />
                </td>
                <td className="py-2 tabular-nums text-muted-foreground">{row.quantity.toLocaleString()}</td>
                <td className="py-2 tabular-nums text-muted-foreground">{row.listings}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
