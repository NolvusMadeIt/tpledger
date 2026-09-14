# Tyria Ledger

Guild Wars 2 price checker, vault, and fence. Live TP prices, stash grids, starred watchlist, click-to-copy chat codes, wiki links.

## Local (web)

```bash
npm install
npm run dev
```

API keys stay on the device (encrypted). Bound items are never listed.

Theme textures live in `public/theme`. Coin icons live in `public/coins`.

## Desktop app

See [convert/README.md](convert/README.md). Unzip, split `convert/` out, drop the ledger folder onto `Drop folder here.bat` (Windows) or `Drop folder here.command` (Mac). Builds land in `apps/`.
