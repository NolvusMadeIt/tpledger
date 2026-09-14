import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { inspectItem } from "@/lib/gw2/functions";
import type { ItemInspect } from "@/lib/gw2/types";
import { BookOpen } from "lucide-react";
import { Coins } from "@/components/coins";
import { FavoriteStar } from "@/components/favorites";
import { RarityLabel } from "@/components/rarity";
import { cn } from "@/lib/utils";

type Anchor = { id: number; el: HTMLElement };

type Ctx = {
  open: (id: number, el: HTMLElement) => void;
  close: () => void;
  activeId: number | null;
};

const InspectContext = createContext<Ctx | null>(null);

const cache = new Map<number, ItemInspect>();
const PAD = 12;
const GAP = 10;
const WIDTH = 340;

function place(anchor: DOMRect, size: { w: number; h: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(size.w, vw - PAD * 2);
  const h = Math.min(size.h, vh - PAD * 2);
  const below = vh - anchor.bottom - GAP - PAD;
  const above = anchor.top - GAP - PAD;
  const placement: "top" | "bottom" = below >= h || below >= above ? "bottom" : "top";
  let top = placement === "bottom" ? anchor.bottom + GAP : anchor.top - GAP - h;
  top = Math.min(Math.max(PAD, top), vh - h - PAD);
  let left = anchor.left + anchor.width / 2 - w / 2;
  left = Math.min(Math.max(PAD, left), vw - w - PAD);
  return { top, left, w, maxH: vh - PAD * 2, placement };
}

export function InspectProvider({ children }: { children: ReactNode }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const close = useCallback(() => setAnchor(null), []);
  const open = useCallback((id: number, el: HTMLElement) => {
    setAnchor((prev) => (prev?.id === id && prev.el === el ? null : { id, el }));
  }, []);

  return (
    <InspectContext.Provider value={{ open, close, activeId: anchor?.id ?? null }}>
      {children}
      {anchor ? <InspectLayer anchor={anchor} onClose={close} /> : null}
    </InspectContext.Provider>
  );
}

export function useInspect(): Ctx {
  const ctx = useContext(InspectContext);
  if (!ctx) throw new Error("InspectProvider missing");
  return ctx;
}

export function Inspectable({
  itemId,
  className,
  style,
  children,
}: {
  itemId: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { open, activeId } = useInspect();
  return (
    <button
      type="button"
      data-inspect={itemId}
      aria-expanded={activeId === itemId}
      onClick={(e) => {
        e.stopPropagation();
        open(itemId, e.currentTarget);
      }}
      style={style}
      className={cn(
        "min-w-0 rounded-md text-left transition-colors duration-150 hover:bg-secondary/60",
        activeId === itemId && "bg-secondary/80",
        className,
      )}
    >
      {children}
    </button>
  );
}

function InspectLayer({ anchor, onClose }: { anchor: Anchor; onClose: () => void }) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ItemInspect | null>(cache.get(anchor.id) ?? null);
  const [error, setError] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, w: WIDTH, maxH: 480, placement: "bottom" as "top" | "bottom" });

  const relayout = useCallback(() => {
    const panel = panelRef.current;
    if (!anchor.el.isConnected) {
      onClose();
      return;
    }
    const rect = anchor.el.getBoundingClientRect();
    const size = panel
      ? { w: panel.offsetWidth || WIDTH, h: panel.offsetHeight || 180 }
      : { w: WIDTH, h: 180 };
    setPos(place(rect, size));
  }, [anchor.el, onClose]);

  useLayoutEffect(() => {
    relayout();
  }, [relayout, data]);

  useEffect(() => {
    const onWin = () => relayout();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [relayout]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (t.closest?.("[data-inspect]")) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    const cached = cache.get(anchor.id);
    if (cached) {
      setData(cached);
      setError("");
      return;
    }
    setData(null);
    setError("");
    void inspectItem({ data: { id: anchor.id } })
      .then((row) => {
        cache.set(row.id, row);
        if (alive) setData(row);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Could not load item.");
      });
    return () => {
      alive = false;
    };
  }, [anchor.id]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label={data?.name ?? "Item"}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.w,
        maxWidth: `calc(100vw - ${PAD * 2}px)`,
        maxHeight: pos.maxH,
        zIndex: 60,
      }}
      className="overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      {error ? <p className="text-sm text-sell">{error}</p> : null}
      {!data && !error ? <p className="text-sm text-muted-foreground">Reading item…</p> : null}
      {data ? <InspectBody data={data} /> : null}
    </div>,
    document.body,
  );
}

function InspectBody({ data }: { data: ItemInspect }) {
  const wiki = `https://wiki.guildwars2.com/wiki/${encodeURIComponent(data.name.replaceAll(" ", "_"))}`;

  return (
    <div>
      <div className="flex items-start gap-3">
        {data.icon ? (
          <img src={data.icon} alt="" className="size-12 rounded-lg bg-secondary object-contain" />
        ) : (
          <div className="size-12 rounded-lg bg-secondary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight tracking-tight">{data.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <RarityLabel rarity={data.rarity} /> · {data.type}
            {data.subtype ? ` / ${data.subtype}` : ""}
            {data.level ? ` · lvl ${data.level}` : ""}
          </p>
        </div>
        <FavoriteStar item={{ id: data.id, name: data.name, icon: data.icon, rarity: data.rarity }} />
      </div>

      {data.description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
      ) : null}

      {data.traded ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-secondary/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Instant sell</p>
            <div className="mt-1">
              <Coins copper={data.instantSell} size="sm" />
            </div>
          </div>
          <div className="rounded-xl bg-secondary/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Instant buy</p>
            <div className="mt-1">
              <Coins copper={data.sell} size="sm" />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-sell">Not listed on the TP.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <CopyBit value={data.chatLink} />
        <span className="text-muted-foreground">·</span>
        <CopyBit value={String(data.id)} label={`#${data.id}`} />
        <a
          href={wiki}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-accent hover:underline"
        >
          <BookOpen className="size-3.5" />
          Wiki
        </a>
      </div>
    </div>
  );
}

function CopyBit({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${value}`}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const el = document.createElement("textarea");
          el.value = value;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          el.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="font-mono text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied" : (label ?? value)}
    </button>
  );
}
