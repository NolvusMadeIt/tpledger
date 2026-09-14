import { FavoriteStar } from "@/components/favorites";
import { Inspectable } from "@/components/item-tooltip";
import { cn } from "@/lib/utils";

const RING: Record<string, string> = {
  Junk: "var(--color-rarity-junk)",
  Basic: "var(--color-rarity-basic)",
  Fine: "var(--color-rarity-fine)",
  Masterwork: "var(--color-rarity-masterwork)",
  Rare: "var(--color-rarity-rare)",
  Exotic: "var(--color-rarity-exotic)",
  Ascended: "var(--color-rarity-ascended)",
  Legendary: "var(--color-rarity-legendary)",
};

export type StashItem = {
  id: number;
  name: string;
  icon: string | null;
  rarity: string;
  count: number;
};

export function StashGrid({ items }: { items: StashItem[] }) {
  return (
    <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
      {items.map((item) => (
        <StashSlot key={item.id} item={item} />
      ))}
    </div>
  );
}

export function StashSlot({ item }: { item: StashItem }) {
  const ring = RING[item.rarity] ?? "var(--color-border)";
  const missing = item.count <= 0;

  return (
    <div className="group relative aspect-square">
      <Inspectable
        itemId={item.id}
        className={cn(
          "relative flex size-full items-center justify-center rounded-none bg-black/55 p-0.5 hover:bg-black/30",
          missing && "opacity-45",
        )}
        style={{ boxShadow: `inset 0 0 0 2px ${ring}` }}
      >
        {item.icon ? (
          <img src={item.icon} alt="" className="size-full object-contain" />
        ) : (
          <span className="px-0.5 text-center text-[9px] leading-tight text-muted-foreground">{item.name}</span>
        )}
        <span className="sr-only">
          {item.name}
          {item.count > 0 ? ` ×${item.count}` : " not in vault"}
        </span>
        {item.count > 1 ? (
          <span className="pointer-events-none absolute right-0.5 bottom-0.5 text-[10px] font-semibold leading-none text-foreground drop-shadow-[0_1px_2px_rgb(0,0,0)]">
            {item.count > 9999 ? `${Math.floor(item.count / 1000)}k` : item.count.toLocaleString()}
          </span>
        ) : null}
      </Inspectable>
      <FavoriteStar
        item={{ id: item.id, name: item.name, icon: item.icon, rarity: item.rarity }}
        className={cn(
          "absolute top-0 right-0 size-6 rounded-none bg-black/50 text-foreground/80 hover:bg-black/70",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      />
    </div>
  );
}
