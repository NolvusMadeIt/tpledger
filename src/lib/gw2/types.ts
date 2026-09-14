export type CoinAmount = number;

export type Rarity =
  | "Junk"
  | "Basic"
  | "Fine"
  | "Masterwork"
  | "Rare"
  | "Exotic"
  | "Ascended"
  | "Legendary"
  | string;

export type SearchHit = {
  id: number;
  name: string;
  rarity: string;
  type: string;
  buy: number;
  sell: number;
  chatLink: string;
};

export type ListingRow = {
  listings: number;
  unitPrice: number;
  quantity: number;
};

export type ItemQuote = {
  id: number;
  name: string;
  rarity: string;
  type: string;
  subtype: string | null;
  icon: string | null;
  vendorValue: number;
  traded: boolean;
  whitelisted: boolean;
  buy: number;
  sell: number;
  buyQuantity: number;
  sellQuantity: number;
  instantSell: number;
  listNet: number;
  spread: number;
  buys: ListingRow[];
  sells: ListingRow[];
  chatLink: string;
};

export type ItemInspect = {
  id: number;
  name: string;
  icon: string | null;
  rarity: string;
  type: string;
  subtype: string | null;
  description: string;
  level: number;
  chatLink: string;
  traded: boolean;
  buy: number;
  sell: number;
  instantSell: number;
  listNet: number;
  vendorValue: number;
};

export type GemRate = {
  coinsFor100Gems: number;
  gemsFor100Gold: number;
};

export type VaultLine = {
  id: number;
  name: string;
  icon: string | null;
  rarity: string;
  type: string;
  count: number;
  buy: number;
  sell: number;
  vendor: number;
  traded: boolean;
  instantSell: number;
  listNet: number;
  buyQuantity: number;
  sellQuantity: number;
};

export type VaultLocation = {
  id: string;
  label: string;
  kind: "bank" | "materials" | "shared" | "character";
  items: VaultLine[];
};

export type VaultSnapshot = {
  accountName: string;
  keyName: string;
  permissions: string[];
  missing: string[];
  locations: VaultLocation[];
  totals: {
    count: number;
    unique: number;
    instantSell: number;
    listNet: number;
    replaceCost: number;
    vendor: number;
    untraded: number;
  };
};
