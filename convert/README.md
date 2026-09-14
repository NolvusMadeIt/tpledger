# Drop to desktop

Reusable wrapper. Drag a web app folder onto it; it builds a Windows and/or Mac desktop app in a sibling `apps` folder.

Works like those “drop a folder on the icon” packagers. This one expects **Node.js**.

## After you unzip tpledger

Split the zip into three folders next to each other:

```
ledger/       ← the Tyria Ledger web app (repo root files)
convert/      ← this folder
apps/         ← created on first run, where .exe / .app land
```

## Convert

1. Install [Node.js](https://nodejs.org).
2. **Windows:** drop `ledger` onto `Drop folder here.bat`
3. **Mac:** drop `ledger` onto `Drop folder here.command`  
   (first time: right-click → Open, so Gatekeeper allows it)
4. Wait. Output is `apps/Tyria Ledger-win32-*` or `apps/Tyria Ledger-darwin-*`

CLI:

```bash
cd convert
npm install
node to-desktop.mjs ../ledger
node to-desktop.mjs ../ledger --win --mac
```

`--win` / `--mac` / `--all` pick targets. Mac builds of a Windows-made app, and the reverse, are unsigned.

## What it wraps

- Folder with `package.json` + `preview` or `start` → builds, then the desktop app runs that server locally and opens a window.
- Folder with `index.html` / `dist/index.html` → opens the file in a window.

Tyria Ledger uses the first path (`npm run build` then `npm run preview`).
