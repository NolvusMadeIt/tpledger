/**
 * Tyria Ledger plugin
 *
 * start(api) is called when the user enables the plugin.
 * Return a function to clean up (unsubscribe) when they disable it.
 *
 * Events:  item:checked, vault:loaded
 * API:     on, notify, play, getSetting, setSetting, log
 *
 * Wiki: https://github.com/NolvusMadeIt/tpledger/wiki/Plugin-API
 */
export function start(api) {
  api.log("Hello Ledger started");

  const offCheck = api.on("item:checked", (quote) => {
    if (!api.getSetting("on", true)) return;
    if (!quote) return;
    const note = api.getSetting("note", "hello");
    api.log(`${note}: ${quote.name}  buy=${quote.buy} sell=${quote.sell}`);
  });

  const offVault = api.on("vault:loaded", (snap) => {
    if (!api.getSetting("on", true)) return;
    api.log(`vault loaded for ${snap?.accountName || "account"}`);
  });

  return () => {
    offCheck();
    offVault();
    api.log("Hello Ledger stopped");
  };
}
