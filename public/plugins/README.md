# Plugins

Drop a folder here. Tyria Ledger picks it up and lists it under Options.

A plugin is a folder:

```
my-plugin/
  plugin.json
  index.js
```

plugin.json:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What it does",
  "entry": "index.js",
  "settings": [
    { "key": "on", "type": "boolean", "label": "Enabled", "default": true }
  ]
}
```

index.js:

```js
export function start(api) {
  return api.on("item:checked", (quote) => {
    api.notify("My Plugin", quote.name);
  });
}
```

Events: `item:checked`, `vault:loaded`.
API: `on`, `notify`, `getSetting`, `setSetting`, `log`.
