/** Trading Post listing 5% + exchange 10%. Min 1 copper each when price > 0. */
export function listingFee(price: number): number {
  if (price <= 0) return 0;
  return Math.max(1, Math.floor(price * 0.05));
}

export function exchangeFee(price: number): number {
  if (price <= 0) return 0;
  return Math.max(1, Math.floor(price * 0.1));
}

export function afterTax(price: number): number {
  if (price <= 0) return 0;
  return price - listingFee(price) - exchangeFee(price);
}

export function splitCoins(copper: number): { g: number; s: number; c: number } {
  const n = Math.max(0, Math.floor(copper || 0));
  return {
    g: Math.floor(n / 10000),
    s: Math.floor((n % 10000) / 100),
    c: n % 100,
  };
}
