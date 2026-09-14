import { useEffect, useState } from "react";
import { Coins } from "@/components/coins";
import { Inspectable } from "@/components/item-tooltip";
import { RarityLabel } from "@/components/rarity";
import { getMarketPulse } from "@/lib/gw2/functions";
import type { MarketPulse, PulseItem } from "@/lib/gw2/types";

export function MarketDesk({ onPick }: { onPick: (id: number, name: string) => void }) {
  const [pulse, setPulse] = useState<MarketPulse | null>(null);

  useEffect(() => {
    let alive = true;
    void getMarketPulse().then((row) => {
      if (alive) setPulse(row);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!pulse) {
    return <p className="mt-10 text-sm text-muted-foreground">Reading the TP…</p>;
  }

  const extra = pulse.fatSpread
    ? Math.max(0, pulse.fatSpread.listNet - pulse.fatSpread.instantSell)
    : 0;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="100 gems"
          hint="What gold buys a stack of 100"
          value={pulse.gems?.coinsFor100Gems ?? 0}
        />
        <Stat
          label="Ecto dump"
          hint="Instant sell, after tax"
          value={pulse.ecto?.instantSell ?? 0}
        />
        <Stat
          label="List premium"
          hint={pulse.fatSpread ? pulse.fatSpread.name : "Biggest wait bonus in this set"}
          value={extra}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Board
          title="Top bought"
          hint="Highest buy-order volume — what's getting eaten"
          rows={pulse.demand}
          amount={(row) => row.buy}
          qty={(row) => row.buyQuantity}
          qtyLabel="Demand"
          onPick={onPick}
        />
        <Board
          title="Top listed"
          hint="Highest sell-listing volume — what's sitting on the board"
          rows={pulse.listed}
          amount={(row) => row.sell}
          qty={(row) => row.sellQuantity}
          qtyLabel="Supply"
          onPick={onPick}
        />
      </div>
    </div>
  );
}

function Stat({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="gw2-well p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2">
        <Coins copper={value} size="lg" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Board({
  title,
  hint,
  rows,
  amount,
  qty,
  qtyLabel,
  onPick,
}: {
  title: string;
  hint: string;
  rows: PulseItem[];
  amount: (row: PulseItem) => number;
  qty: (row: PulseItem) => number;
  qtyLabel: string;
  onPick: (id: number, name: string) => void;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-1 border-t border-border first:border-0">
            <span className="w-7 shrink-0 text-center font-display text-sm text-coin-gold">{i + 1}</span>
            <Inspectable itemId={row.id} className="shrink-0 p-1">
              {row.icon ? (
                <img src={row.icon} alt="" className="size-8 rounded-md bg-secondary object-contain" />
              ) : (
                <div className="size-8 rounded-md bg-secondary" />
              )}
            </Inspectable>
            <button
              type="button"
              onClick={() => onPick(row.id, row.name)}
              className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left hover:bg-secondary/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{row.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  <RarityLabel rarity={row.rarity} /> · {qtyLabel} {qty(row).toLocaleString()}
                </span>
              </span>
              <Coins copper={amount(row)} size="sm" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
