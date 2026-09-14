# Plugin guide

A plugin is a folder with two files. The app watches `plugins/` next to the exe and `public/plugins/` in source.

```
hello-ledger/
  plugin.json    # required
  index.js       # required (or whatever "entry" says)
```

## plugin.json

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Folder name. Lowercase, hyphens. |
| `name` | yes | Shown in Settings |
| `version` | yes | Semver. Must match the branch: `plugin_<id>_<version>` |
| `author` | no | Your name |
| `description` | no | One line |
| `entry` | no | Default `index.js` |
| `settings` | no | Array of fields (see below) |

Setting field:

```json
{
  "key": "minGold",
  "type": "boolean | number | text | sound",
  "label": "Min premium (gold)",
  "default": 1,
  "min": 0,
  "max": 999,
  "hint": "Shown under the control"
}
```

## index.js

```js
export function start(api) {
  const off = api.on("item:checked", (quote) => {
    api.notify("My plugin", quote.name);
  });
  return off; // called when the user disables the plugin
}
```

`start` may be async. Return a cleanup function.

## Submit

1. Copy [`docs/plugin-template`](https://github.com/NolvusMadeIt/tpledger/tree/main/docs/plugin-template).
2. Branch: `plugin_<id>_<version>`
3. PR into `main`
4. Keep the diff inside your plugin folder unless a maintainer asked otherwise

Bundled plugins (Flip Watch, Chat Copy) are listed in `public/plugins/index.json`. Do not add yours there in the PR unless maintainers want it shipped inside the exe.

## Test

- Drop the folder on Settings, or into `plugins/` beside the exe
- Enable it
- Price-check an item
- Disable it — cleanup should run
- Reload the app — settings should stick

Next: [Plugin API](Plugin-API).
