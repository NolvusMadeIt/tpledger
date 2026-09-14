import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronUp, Search, Settings, Warehouse, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Coins } from "./coins";
import { getGemRate } from "@/lib/gw2/functions";
import { isDesktop } from "@/lib/desktop/protocol";
import type { GemRate } from "@/lib/gw2/types";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [gems, setGems] = useState<GemRate | null>(null);
  const [showTop, setShowTop] = useState(false);
  const desktop = isDesktop();
  const through = useRef(false);
  const scroller = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    void getGemRate().then((row) => {
      if (alive) setGems(row);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const onMove = (event: MouseEvent) => {
      const node = event.target as HTMLElement | null;
      const hit = Boolean(node?.closest(".gw2-window"));
      const next = !hit;
      if (through.current === next) return;
      through.current = next;
      window.tyriaDesktop?.setClickThrough(next);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [desktop]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = 0;
    setShowTop(false);
  }, [pathname]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setShowTop(el.scrollTop > 220);
  }

  function toTop() {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.scrollTop = 0;
      return;
    }
    const start = el.scrollTop;
    const t0 = performance.now();
    const dur = 980;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - p) ** 3;
      el.scrollTop = start * (1 - ease);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return (
    <div className="gw2-stage text-foreground">
      <div className="gw2-frame mx-auto max-w-6xl">
        <img src="/brand/lion.png" alt="" className="gw2-lion" />
        <div className="gw2-window">
          <header className="gw2-chrome">
            <Link to="/" className="flex min-w-0 items-end gap-2.5">
              <span className="font-display text-[1.55rem] leading-none tracking-[0.08em] text-accent sm:text-[1.7rem]">
                Tyria Ledger
              </span>
              <span className="mb-0.5 text-[13px] tracking-wide text-muted-foreground">TP</span>
            </Link>
            <span className="ml-auto flex items-center gap-3">
              {gems ? (
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <span>100 gems</span>
                  <Coins copper={gems.coinsFor100Gems} size="sm" />
                </span>
              ) : null}
              {desktop ? (
                <button
                  type="button"
                  className="gw2-close"
                  aria-label="Close"
                  onClick={() => void window.tyriaDesktop?.hideToTray()}
                >
                  <X className="size-3.5" strokeWidth={2.4} />
                </button>
              ) : null}
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <aside className="gw2-sidebar flex shrink-0 flex-col sm:w-48">
              <p className="hidden px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                Menu
              </p>
              <nav className="flex flex-1 gap-1 overflow-x-auto px-0 pb-2 sm:flex-col sm:gap-0 sm:overflow-visible sm:pb-3">
                <NavLink to="/" active={pathname === "/"} icon={<Search className="size-4" />}>
                  Price Check
                </NavLink>
                <NavLink to="/vault" active={pathname === "/vault"} icon={<Warehouse className="size-4" />}>
                  Vault
                </NavLink>
                <span className="hidden flex-1 sm:block" />
                <NavLink
                  to="/settings"
                  active={pathname === "/settings" || pathname === "/options"}
                  icon={<Settings className="size-4" />}
                >
                  Settings
                </NavLink>
              </nav>
            </aside>
            <div className="relative min-h-0 min-w-0 flex-1">
              <main
                ref={scroller}
                onScroll={onScroll}
                className="gw2-scroll h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
              >
                {children}
              </main>
              {showTop ? (
                <button type="button" className="gw2-top" aria-label="Scroll to top" onClick={toTop}>
                  <ChevronUp className="size-5" strokeWidth={2.4} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  to,
  active,
  icon,
  children,
}: {
  to: "/" | "/vault" | "/settings";
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-9 min-w-28 shrink-0 items-center gap-2 px-4 text-sm sm:min-w-0 sm:w-full",
        active ? "bg-select text-select-foreground" : "text-foreground/90 hover:bg-secondary/80",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
