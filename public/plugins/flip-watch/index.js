export function start(api) {
  return api.on("item:checked", (quote) => {
    if (!quote || !api.getSetting("notify", true)) return;
    const extra = ((quote.listNet || 0) - (quote.instantSell || 0)) / 10000;
    const bar = Number(api.getSetting("minGold", 1)) || 0;
    if (extra < bar) return;
    api.notify("Flip Watch", `${quote.name} lists ${extra.toFixed(1)}g over dump`);
  });
}
