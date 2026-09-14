import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Settings, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { Coins } from "./coins";
import { getGemRate } from "@/lib/gw2/functions";
import type { GemRate } from "@/lib/gw2/types";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [gems, setGems] = useState<GemRate | null>(null);

  useEffect(() => {
    let alive = true;
    void getGemRate().then((row) => {
      if (alive) setGems(row);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="gw2-stage text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl items-stretch px-2 py-3 sm:px-3 sm:py-5">
        <div className="gw2-window flex w-full flex-col overflow-hidden">
          <header className="flex items-baseline justify-between gap-4 px-4 pt-3 pb-2 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0">
              <Link to="/" className="font-display text-2xl tracking-wide text-accent sm:text-[1.7rem]">
                Tyria Ledger
              </Link>
              <span className="text-sm text-muted-foreground">TP</span>
            </div>
            {gems ? (
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                <div className="flex items-center justify-end gap-1.5">
                  <span>100 gems</span>
                  <Coins copper={gems.coinsFor100Gems} size="sm" />
                </div>
              </div>
            ) : null}
          </header>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <aside className="gw2-sidebar flex shrink-0 flex-col sm:w-56">
              <p className="hidden px-4 pb-2 pt-3 text-xs text-muted-foreground sm:block">Menu</p>
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
            <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {children}
            </main>
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
