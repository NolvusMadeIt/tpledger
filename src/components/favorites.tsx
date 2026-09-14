import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { loadFavorites, saveFavorites, type Favorite } from "@/lib/gw2/favorites";
import { cn } from "@/lib/utils";

type Ctx = {
  items: Favorite[];
  ids: Set<number>;
  has: (id: number) => boolean;
  toggle: (item: Favorite) => void;
};

const FavoritesContext = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Favorite[]>([]);

  useEffect(() => {
    setItems(loadFavorites());
  }, []);
  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const toggle = useCallback((item: Favorite) => {
    setItems((prev) => {
      const exists = prev.some((row) => row.id === item.id);
      const next = exists ? prev.filter((row) => row.id !== item.id) : [{ ...item }, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      ids,
      has: (id) => ids.has(id),
      toggle,
    }),
    [items, ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): Ctx {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("FavoritesProvider missing");
  return ctx;
}

export function FavoriteStar({
  item,
  className,
}: {
  item: Favorite;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const on = has(item.id);
  return (
    <button
      type="button"
      aria-label={on ? `Remove ${item.name} from watchlist` : `Add ${item.name} to watchlist`}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        toggle(item);
      }}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground",
        on && "text-coin-gold",
        className,
        on && "opacity-100",
      )}
    >
      <Star className={cn("size-3.5", on && "fill-current")} />
    </button>
  );
}
