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

Output: `apps/Tyria Ledger-win32-x64/Tyria Ledger.exe`.

Windows SmartScreen will call it an **unknown publisher** until the exe is Authenticode-signed. That is not a virus warning. Until a code-signing cert is in `desktop/certs/`, click **More info → Run anyway**. See `desktop/SIGNING.md`.

- Close / hotkey (`Control+Shift+L` by default) hides next to the clock.
- Dock left or right in Settings.
- Drop plugin folders into `plugins/` beside the exe, or onto Settings.

## Plugins

See `public/plugins/README.md`. Bundled: Flip Watch, Chat Copy.
