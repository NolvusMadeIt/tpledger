# How to code

## Stack

- UI: React + TanStack Start + Vite + Tailwind
- Desktop: Electron (`desktop/main.mjs`)
- GW2: official API (`api.guildwars2.com`) via `src/lib/gw2/`
- Plugins: ES module `start(api)` loaded from a folder

## Layout

```
src/routes/            pages — Price Check `/`, Vault `/vault`, Settings `/settings`
src/components/        shell, tooltips, stash, fence
src/lib/gw2/           API, chat links, vault
src/lib/plugins/       loader, bus, settings store
public/plugins/        bundled plugins (listed in index.json)
public/icons/          Black Lion mark
desktop/               Electron main, updater, pack-win.mjs
docs/plugin-template/  copy this to make a plugin
```

## Rules

- Do not commit `node_modules`, `apps/`, or `.output/`.
- Do not log or display API keys. They are encrypted on device.
- Account-bound items stay off the TP lists.
- Prefer editing an existing file over adding a new helper for a one-off.
- Plugins must not fetch random URLs with the user's key.

## App changes

App code is **maintainer** work on `main`. Collaborators submit **plugins** unless a maintainer asked for an app PR.

```bash
npm install
npm run dev
npm run typecheck
```

Desktop rebuild (maintainers):

```bash
node desktop/pack-win.mjs
```

## UI notes

- Overlay chrome is frameless. Do not add a native title bar.
- Vault bags honor `vaultBagsOpen` in Settings (collapsed by default).
- Coins use `public/coins/{gold,silver,copper}.png`.
