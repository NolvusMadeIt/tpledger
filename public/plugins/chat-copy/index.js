export function start(api) {
  return api.on("item:checked", (quote) => {
    if (!quote?.chatLink || !api.getSetting("copy", true)) return;
    void navigator.clipboard?.writeText(quote.chatLink);
    api.log(`copied ${quote.chatLink}`);
  });
}
