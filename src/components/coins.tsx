import { splitCoins } from "@/lib/gw2/money";
import { cn } from "@/lib/utils";

const ICONS = {
  g: { src: "/coins/gold.png", alt: "gold" },
  s: { src: "/coins/silver.png", alt: "silver" },
  c: { src: "/coins/copper.png", alt: "copper" },
} as const;

export function Coins({
  copper,
  className,
  size = "md",
}: {
  copper: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { g, s, c } = splitCoins(copper);
  const icon = size === "lg" ? "size-4" : size === "sm" ? "size-3" : "size-3.5";
  const text = size === "lg" ? "text-xl gap-1.5" : size === "sm" ? "text-xs gap-1" : "text-sm gap-1";
  const showG = g > 0;
  const showS = showG || s > 0;

  return (
    <span className={cn("inline-flex items-center font-medium tabular-nums", text, className)}>
      {showG ? <Unit value={g} kind="g" iconClass={icon} /> : null}
      {showS ? <Unit value={s} kind="s" iconClass={icon} /> : null}
      <Unit value={c} kind="c" iconClass={icon} />
    </span>
  );
}

function Unit({ value, kind, iconClass }: { value: number; kind: "g" | "s" | "c"; iconClass: string }) {
  const icon = ICONS[kind];
  return (
    <span className="inline-flex items-center gap-0.5">
      {value.toLocaleString()}
      <img src={icon.src} alt={icon.alt} className={cn(iconClass, "shrink-0 translate-y-px")} />
    </span>
  );
}
