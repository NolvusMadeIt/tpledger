# Tyria Ledger

Guild Wars 2 price checker, vault, fence, overlay, and plugins.

## Web

```bash
npm install
npm run dev
```

API keys stay on the device. Bound items are never listed.

## Desktop (Windows)

```bash
node desktop/pack-win.mjs
```

Output: `apps/Tyria Ledger-win32-x64/Tyria Ledger.exe` (mystic coin icon).

- Close / hotkey (`Control+Shift+L` by default) hides next to the clock.
- Dock left or right in Options.
- Drop plugin folders into `plugins/` beside the exe, or onto Options.

## Plugins

See `public/plugins/README.md`. Bundled: Flip Watch, Chat Copy.
