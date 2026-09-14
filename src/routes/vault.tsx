import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, KeyRound, Lock, RefreshCw, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useFavorites } from "@/components/favorites";
import { FenceBoard } from "@/components/fence-board";
import { StashGrid } from "@/components/stash-slot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins } from "@/components/coins";
import { loadVault } from "@/lib/gw2/functions";
import {
  forgetApiKey,
  lockApiKey,
  migrateLegacyKey,
  peekSavedKey,
  unlockApiKey,
  type SavedKeyMeta,
} from "@/lib/gw2/key-store";
import { clearVaultCache, readVaultCache, writeVaultCache } from "@/lib/gw2/vault-cache";
import { emitPluginEvent } from "@/lib/plugins/bus";
import type { VaultLine, VaultLocation, VaultSnapshot } from "@/lib/gw2/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  component: VaultPage,
});

type Filter = "all" | "starred" | "bank" | "materials" | "shared" | "character" | "fence";

let loadLock = false;

function VaultPage() {
  const { items: favs, ids: favIds } = useFavorites();
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState<SavedKeyMeta | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [draftName, setDraftName] = useState("");
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setHydrated(true);
    setSaved(peekSavedKey());
    setSnapshot(readVaultCache());
    let alive = true;
    void (async () => {
      const meta = await migrateLegacyKey();
      if (!alive) return;
      setSaved(meta);
      if (meta) void runLoad("saved");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveSecret(source: "saved" | "draft"): Promise<string> {
    if (source === "saved") return unlockApiKey();
    const pasted = draftKey.trim();
    if (!pasted) throw new Error("Paste an API key.");
    return pasted;
  }

  async function runLoad(source: "saved" | "draft") {
    if (loadLock) return;
    loadLock = true;
    setBusy(true);
    setError("");
    try {
      const secret = await resolveSecret(source);
      const data = await loadVault({ data: { apiKey: secret } });
      const name = (source === "draft" ? draftName : saved?.name)?.trim() || data.keyName || "Vault key";
      setSnapshot(data);
      writeVaultCache(data);
      emitPluginEvent("vault:loaded", data);
      const meta = await lockApiKey(secret, name);
      setSaved(meta);
      setDraftKey("");
      setDraftName("");
      setReplacing(false);
    } catch (err) {
      if (!snapshot) setSnapshot(null);
      setError(err instanceof Error ? err.message : "Could not load the vault.");
    } finally {
      loadLock = false;
      setBusy(false);
    }
  }

  async function onForget() {
    await forgetApiKey();
    clearVaultCache();
    setSaved(null);
    setSnapshot(null);
    setDraftKey("");
    setDraftName("");
    setReplacing(false);
    setError("");
  }

  const showForm = !saved || replacing;

  const watch = useMemo(() => {
    const owned = new Map<number, { count: number; line: VaultLine }>();
    if (snapshot) {
      for (const loc of snapshot.locations) {
        for (const item of loc.items) {
          if (!favIds.has(item.id)) continue;
          const prev = owned.get(item.id);
          if (prev) prev.count += item.count;
          else owned.set(item.id, { count: item.count, line: item });
        }
      }
    }
    const rows = favs.map((fav) => {
      const hit = owned.get(fav.id);
      return {
        fav,
        count: hit?.count ?? 0,
        line: hit?.line ?? null,
      };
    });
    let instantSell = 0;
    let listNet = 0;
    let replaceCost = 0;
    let count = 0;
    for (const row of rows) {
      if (!row.line) continue;
      instantSell += row.line.instantSell * row.count;
      listNet += row.line.listNet * row.count;
      replaceCost += row.line.sell * row.count;
      count += row.count;
    }
    return { rows, instantSell, listNet, replaceCost, count };
  }, [snapshot, favs, favIds]);

  const locations = useMemo(() => {
    if (!snapshot) return [];
    const q = query.trim().toLowerCase();
    return snapshot.locations
      .filter((loc) => filter === "all" || filter === "starred" || loc.kind === filter)
      .map((loc) => ({
        ...loc,
        items: loc.items.filter((item) => {
          if (filter === "starred" && !favIds.has(item.id)) return false;
          if (!q) return true;
          return item.name.toLowerCase().includes(q) || String(item.id) === q;
        }),
      }))
      .filter((loc) => loc.items.length > 0);
  }, [snapshot, filter, query, favIds]);

  return (
    <AppShell>
      <div className="gw2-banner mb-6 px-4 py-3">
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Vault</h1>
        <p className="mt-1 text-sm text-foreground/80">
          Bank, mats, shared, and char bags — priced against live TP listings. Instant sell is after the 15% tax. Star what matters; Stars totals only those.
        </p>
      </div>

      <section className="gw2-well p-5 sm:p-6">
        { !hydrated ? (
          <p className="text-sm text-muted-foreground">Opening vault…</p>
        ) : showForm ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="size-4 shrink-0" />
              <span>
                The key is encrypted on this device and never shown again. Create one at
                account.arena.net with <span className="text-foreground">account</span> and{" "}
                <span className="text-foreground">inventories</span>. Add{" "}
                <span className="text-foreground">characters</span> to include bags.
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Key name"
                aria-label="Key name"
                id="key-name"
                maxLength={48}
              />
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="Paste API key"
                className="font-mono text-sm"
                id="api-key"
                aria-label="Guild Wars 2 API key"
              />
              <div className="flex gap-2">
                <Button onClick={() => void runLoad("draft")} disabled={busy}>
                  <Lock className="size-4" />
                  {busy ? "Locking…" : "Save & load"}
                </Button>
                {replacing ? (
                  <Button variant="ghost" onClick={() => setReplacing(false)} disabled={busy}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <Lock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locked key</p>
                <p className="font-display text-2xl tracking-tight">{saved.name}</p>
                <p className="text-xs text-muted-foreground">Hidden on this device · cannot be viewed or edited</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runLoad("saved")} disabled={busy}>
                <RefreshCw className={cn("size-4", busy && "animate-spin")} />
                {busy ? "Reading…" : "Refresh"}
              </Button>
              <Button variant="outline" onClick={() => setReplacing(true)} disabled={busy}>
                Replace
              </Button>
              <Button variant="ghost" onClick={() => void onForget()} disabled={busy}>
                Forget
              </Button>
            </div>
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-sell">{error}</p> : null}
        {busy ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {snapshot ? "Refreshing from the TP in the background…" : "Reading bags and pricing stacks…"}
          </p>
        ) : null}
      </section>

      {snapshot ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Total label="Instant" hint="Dump to buy orders, after tax" value={snapshot.totals.instantSell} />
            <Total label="Listed" hint="Net after tax at current sell" value={snapshot.totals.listNet} />
            <Total label="Replace" hint="Buy it all off the TP right now" value={snapshot.totals.replaceCost} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {snapshot.accountName} · {snapshot.totals.count.toLocaleString()} items ·{" "}
            {snapshot.totals.unique.toLocaleString()} unique
            {snapshot.totals.untraded
              ? ` · ${snapshot.totals.untraded.toLocaleString()} not on the TP`
              : ""}
            {snapshot.missing.includes("characters")
              ? " · Add chars permission for bags"
              : ""}
          </p>

          <Watchlist watch={watch} loaded={Boolean(snapshot)} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All", "All"],
                  ["starred", "Stars", "Watchlist"],
                  ["bank", "Bank", "Bank"],
                  ["materials", "Mats", "Materials"],
                  ["shared", "Shared", "Shared inventory"],
                  ["character", "Chars", "Characters"],
                  ["fence", "Fence", "Fence"],
                ] as const
              ).map(([id, label, title]) => (
                <button
                  key={id}
                  type="button"
                  title={title}
                  onClick={() => setFilter(id)}
                  className={cn(
                    "h-9 px-3 text-sm",
                    filter === id ? "bg-select text-select-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter items"
              className="h-9 sm:max-w-xs"
            />
          </div>

          <div className="mt-6 space-y-3">
            {filter === "fence" ? (
              <FenceBoard snapshot={snapshot} query={query} />
            ) : (
              <>
                {locations.map((loc) => (
                  <LocationBlock
                    key={loc.id}
                    loc={loc}
                    defaultOpen={filter !== "all" || loc.kind !== "character"}
                  />
                ))}
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {filter === "starred" ? "None of your starred items are in this vault." : "Nothing in this view."}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : favs.length ? (
        <Watchlist watch={watch} loaded={false} />
      ) : null}
    </AppShell>
  );
}

function Watchlist({
  watch,
  loaded,
}: {
  watch: {
    rows: { fav: { id: number; name: string; icon: string | null; rarity: string }; count: number; line: VaultLine | null }[];
    instantSell: number;
    listNet: number;
    replaceCost: number;
    count: number;
  };
  loaded: boolean;
}) {
  return (
    <section className="mt-8 gw2-well p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Star className="size-3.5 fill-current text-coin-gold" />
            Stars
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">What you marked</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {watch.rows.length
              ? loaded
                ? `${watch.count.toLocaleString()} owned across ${watch.rows.length} starred item${watch.rows.length === 1 ? "" : "s"}`
                : `${watch.rows.length} starred · load the vault to price them`
              : "Star items below. This list stays on this device."}
          </p>
        </div>
        {loaded && watch.rows.length ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Stars instant</p>
            <div className="mt-1">
              <Coins copper={watch.instantSell} size="lg" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Listed net <Coins copper={watch.listNet} size="sm" />
              {" · "}replace <Coins copper={watch.replaceCost} size="sm" />
            </p>
          </div>
        ) : null}
      </div>

      {watch.rows.length ? (
        <div className="mt-5">
          <StashGrid
            items={watch.rows.map((row) => ({
              id: row.fav.id,
              name: row.fav.name,
              icon: row.fav.icon,
              rarity: row.fav.rarity,
              count: row.count,
            }))}
          />
        </div>
      ) : null}
    </section>
  );
}

function Total({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2">
        <Coins copper={value} size="lg" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function LocationBlock({ loc, defaultOpen }: { loc: VaultLocation; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const instant = loc.items.reduce((sum, item) => sum + item.instantSell * item.count, 0);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <h2 className="min-w-0 flex-1 font-display text-xl tracking-wide">{loc.label}</h2>
        <p className="text-xs text-muted-foreground">
          {loc.items.length} · <Coins copper={instant} size="sm" />
        </p>
      </button>
      {open ? <StashGrid items={loc.items} /> : null}
    </section>
  );
}
