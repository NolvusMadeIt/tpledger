# Plugin template

Source in the repo: [`docs/plugin-template/`](https://github.com/NolvusMadeIt/tpledger/tree/main/docs/plugin-template)

## plugin.json

```json
{
  "id": "hello-ledger",
  "name": "Hello Ledger",
  "version": "0.1.0",
  "author": "Your name",
  "description": "Logs a line when you price-check an item. Replace this.",
  "entry": "index.js",
  "settings": [
    {
      "key": "on",
      "type": "boolean",
      "label": "Run",
      "default": true,
      "hint": "Turn the plugin off without uninstalling it."
    },
    {
      "key": "note",
      "type": "text",
      "label": "Note",
      "default": "hello",
      "hint": "Shown in the log."
    }
  ]
}
```

## index.js

```js
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
```

## Branch

```
plugin_hello-ledger_0.1.0
```

Then PR into `main`.
