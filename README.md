<p align="center">
  <img src="public/icons/blacklion.png" alt="Tyria Ledger" width="180" />
</p>

<h1 align="center">Tyria Ledger</h1>

<p align="center">
  Guild Wars 2 Trading Post prices, vault appraisal, and a desktop overlay.<br />
  Paste a chat link. See the gold.
</p>

<p align="center">
  <a href="https://github.com/NolvusMadeIt/tpledger/releases/latest"><img src="https://img.shields.io/github/v/release/NolvusMadeIt/tpledger?label=download&color=c4a056" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/Guild%20Wars%202-Trading%20Post-6a5d45" alt="GW2" />
</p>

<p align="center">
  <img src="public/theme/hall.jpg" alt="Tyria Ledger hall" width="720" />
</p>

---

## What it does

| | |
| --- | --- |
| **Price Check** | Search by name, item id, or an in-game chat copy like `[4 Heads of Cabbage]` / `[&AgGNhQAA]`. Live buy, sell, and tax. |
| **Vault** | Bank, materials, shared slots, and character bags. Bound items stay off the list. Bags start collapsed. |
| **Fence** | What to list, what not to dump, where the stack lives, and which character has more. |
| **Stars** | Favorite items. Totals only those. |
| **Overlay** | Frameless window, tray next to the clock, hotkey to slide in. |
| **Plugins** | Drop a folder in `plugins/` and it shows up in Settings. |

<p align="center">
  <img src="public/coins/gold.png" alt="gold" width="22" />
  <img src="public/coins/silver.png" alt="silver" width="22" />
  <img src="public/coins/copper.png" alt="copper" width="22" />
</p>

---

## Get started — Windows app

1. Grab the latest zip from **[Releases](https://github.com/NolvusMadeIt/tpledger/releases/latest)** (`TyriaLedger-win64.zip`).
2. Unzip it somewhere **you** choose. Nothing installs itself into Program Files.
3. Run `Tyria Ledger.exe`.
4. Windows SmartScreen may say **Unknown publisher**. That is unsigned, not a virus. **More info → Run anyway**. Signing notes: [`desktop/SIGNING.md`](desktop/SIGNING.md).
5. Open **Vault**, paste an API key, give it a name, hit **Save & load**.

### API key

Create one at [account.arena.net](https://account.arena.net/applications).

Permissions you actually need:

- `account`
- `inventories`
- `characters` (bags on each toon)

The key is encrypted on this machine and never shown again. There is no “view key.” Replace it if you need a new one.

### Overlay

| | |
| --- | --- |
| Hotkey | `Control+Shift+L` (change in Settings) |
| Dock | Left or right |
| Minimize | Dash button, or Close-to-tray |
| Close | Quits |

---

## Get started — web (dev)

```bash
git clone https://github.com/NolvusMadeIt/tpledger.git
cd tpledger
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:8080`). Same app, no tray / updater.

---

## Using it

### Price check

- Type a name.
- Paste `[4 Heads of Cabbage]` — brackets and counts are stripped.
- Paste a chat code `[&AgGNhQAA]`. Click the code or `#id` in the tooltip to copy.
- Empty search shows a short market pulse (top sold / selling), not a blank page.
- Tooltips stay on screen and link the wiki.

### Vault

- Bank / Mats / Shared / each character are accordions. **Collapsed by default.**
- Settings → **Expand vault bags** if you want them open.
- Stars sit above the bags and total only what you marked.
- Fence lists tradable flips and which bag / character holds them.

### Updates

Settings → pick a version → pick a folder → **Close and install**.

You get a progress window: **Download → Unpack → Restart**. No mystery console.

Versions live on `version-*` branches. Latest is at the top of the dropdown.

---

## Plugins

Drop a folder next to the exe:

```
Tyria Ledger.exe
plugins/
  my-plugin/
    plugin.json
    index.js
```

Or drop the folder onto **Settings**. Enable it there. Bundled: **Flip Watch**, **Chat Copy**.

See [`public/plugins/README.md`](public/plugins/README.md).

---

## Build the Windows zip yourself

```bash
npm install
node desktop/pack-win.mjs
```

Output: `apps/Tyria Ledger-win32-x64/`.

---

## Privacy

- API keys never leave the device except to talk to `api.guildwars2.com`.
- Account-bound items are not listed or priced as TP stock.
- No telemetry.

---

<p align="center">
  <img src="public/icons/blacklion.png" alt="" width="72" />
</p>
