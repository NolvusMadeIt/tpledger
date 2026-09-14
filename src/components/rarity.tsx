import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  Junk: "text-rarity-junk",
  Basic: "text-rarity-basic",
  Fine: "text-rarity-fine",
  Masterwork: "text-rarity-masterwork",
  Rare: "text-rarity-rare",
  Exotic: "text-rarity-exotic",
  Ascended: "text-rarity-ascended",
  Legendary: "text-rarity-legendary",
};

export function RarityLabel({ rarity, className }: { rarity: string; className?: string }) {
  return <span className={cn(MAP[rarity] ?? "text-muted-foreground", className)}>{rarity}</span>;
}
