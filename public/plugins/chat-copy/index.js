export function start(api) {
  return api.on("item:checked", (quote) => {
    if (!quote?.chatLink) return;
    void navigator.clipboard?.writeText(quote.chatLink);
    api.log(`copied ${quote.chatLink}`);
  });
}
