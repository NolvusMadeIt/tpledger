# Tyria Ledger

Guild Wars 2 price checker, vault, fence, overlay, and plugins.

## Download (Windows)

[**Tyria Ledger 1.0.0**](https://github.com/NolvusMadeIt/tpledger/releases/tag/v1.0.0) — unzip and run `Tyria Ledger.exe`.

- Closes to the tray (mystic coin icon)
- Hotkey `Control+Shift+L` slides from the left or right (set in Options)
- Drop plugin folders into `plugins/` next to the exe

## Web (dev)

```bash
npm install
npm run dev
```

API keys stay on the device. Bound items are never listed.

## Rebuild the exe

```bash
node desktop/pack-win.mjs
```
