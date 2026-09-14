import { Scale } from "lucide-react";
import { Coins } from "@/components/coins";
import { FavoriteStar } from "@/components/favorites";
import { Inspectable } from "@/components/item-tooltip";
import { RarityLabel } from "@/components/rarity";
import { appraiseVault, type FenceHome, type FenceTip } from "@/lib/gw2/fence";
import type { VaultSnapshot } from "@/lib/gw2/types";

export function FenceBoard({ snapshot, query }: { snapshot: VaultSnapshot; query: string }) {
  const brief = appraiseVault(snapshot, query);

  return (
    <div className="space-y-8">
      <section className="gw2-well p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Scale className="size-3.5" />
          The Fence
        </p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">Show me the bags</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Appraisal of what you can actually sell, then the quiet part: what to dump, what to list, and
          which spreads are a trap after the 15%. Each name says where it sits and who to log.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Mini label="Dump it now" hint="Buy orders, after tax" value={brief.dumpTotal} />
          <Mini label="Patience premium" hint="Extra if you list at sell" value={brief.patience} />
          <Mini label="Flip book" hint="After-tax edge on names that still work" value={brief.flipBook} />
        </div>
      </section>

      <section className="gw2-well p-5 sm:p-6">
        <h3 className="font-display text-2xl tracking-tight">House rules</h3>
        <ol className="mt-4 space-y-3">
          {brief.secrets.map((secret, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 w-6 shrink-0 font-display text-lg text-coin-gold">{i + 1}</span>
              <span>{secret}</span>
            </li>
          ))}
        </ol>
      </section>

      <TipList
        title="Where the gold is"
        empty="Nothing with a buy order. The fence has no number for this."
        rows={brief.holdings}
        amountLabel="Dump"
      />
      <TipList
        title="List these. Don't dump."
        empty="No stack pays a real premium for waiting. Instant sell is fine."
        rows={brief.listThese}
        amountLabel="Extra"
      />
      <TipList
        title="The book — names that still flip"
        empty="No after-tax edge in this vault. Don't restock a spread the taxman owns."
        rows={brief.flips}
        amountLabel="Each"
      />
      <TipList
        title="Looks juicy. Tax eats it."
        empty="No fake spreads here. The honest ones are listed above."
        rows={brief.traps}
        amountLabel="Gross"
      />
      <TipList
        title="Dead to the TP"
        empty="Everything here can list. Rare."
        rows={brief.dead}
        amountLabel="Vendor"
      />
    </div>
  );
}

function Mini({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2">
        <Coins copper={value} size="lg" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Homes({ homes }: { homes: FenceHome[] }) {
  if (!homes.length) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-1.5">
      {homes.map((home) => (
        <span
          key={`${home.kind}:${home.label}`}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/80 px-1.5 py-0.5 text-[11px] text-foreground/90"
        >
          <span className={home.kind === "character" ? "text-coin-gold" : "text-muted-foreground"}>
            {home.label}
          </span>
          <span className="text-muted-foreground">×{home.count.toLocaleString()}</span>
        </span>
      ))}
    </p>
  );
}

function TipList({
  title,
  empty,
  rows,
  amountLabel,
}: {
  title: string;
  empty: string;
  rows: FenceTip[];
  amountLabel: string;
}) {
  return (
    <section>
      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          <div className="hidden grid-cols-[auto_1fr_auto] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:grid">
            <span className="w-10" />
            <span>Item · where</span>
            <span>{amountLabel}</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-1 border-t border-border px-2 py-1.5 first:border-0 sm:px-3">
              <FavoriteStar item={{ id: row.id, name: row.name, icon: row.icon, rarity: row.rarity }} />
              <Inspectable itemId={row.id} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                {row.icon ? (
                  <img src={row.icon} alt="" className="size-9 rounded-md bg-secondary object-contain" />
                ) : (
                  <div className="size-9 rounded-md bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <RarityLabel rarity={row.rarity} /> · ×{row.count.toLocaleString()} total · {row.note}
                  </p>
                  <Homes homes={row.homes} />
                </div>
                <Coins copper={row.amount} size="sm" />
              </Inspectable>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
