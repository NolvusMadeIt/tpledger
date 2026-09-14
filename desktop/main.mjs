import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_VERSION,
  installVersion,
  listVersions,
  pickInstallDir,
  pickTarget,
  toastUpdate,
} from "./updater.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 17331;
const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");

const DEFAULTS = {
  dock: "right",
  hotkey: "Control+Shift+L",
  tray: true,
  alwaysOnTop: true,
  installDir: "",
  autoUpdate: true,
  preferredVersion: "latest",
  githubToken: "",
};

let win = null;
let tray = null;
let server = null;
let visible = true;
let settings = { ...DEFAULTS };
let watchers = [];
let lastVersions = [];

function emitStatus(status) {
  win?.webContents.send("updater:status", status);
}

function loadSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf8"));
    settings = { ...DEFAULTS, ...parsed };
  } catch {
    settings = { ...DEFAULTS };
  }
}

function saveSettings() {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2));
}

function res(...parts) {
  return app.isPackaged ? path.join(process.resourcesPath, ...parts) : path.join(here, ...parts);
}

function iconPath() {
  const trayIco = res("tray.ico");
  const ico = res("icon.ico");
  if (fs.existsSync(trayIco)) return trayIco;
  if (fs.existsSync(ico)) return ico;
  const local = path.join(here, "icon.ico");
  return fs.existsSync(local) ? local : ico;
}

function pluginsDirs() {
  const drop = app.isPackaged
    ? path.join(path.dirname(process.execPath), "plugins")
    : path.join(here, "..", "public", "plugins");
  const user = path.join(app.getPath("userData"), "plugins");
  fs.mkdirSync(drop, { recursive: true });
  fs.mkdirSync(user, { recursive: true });
  return { drop, user };
}

function readPlugins() {
  const { drop, user } = pluginsDirs();
  const bundled = app.isPackaged ? res("plugins") : path.join(here, "..", "public", "plugins");
  const out = [];
  const seen = new Set();
  for (const root of [bundled, drop, user]) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      const dir = path.join(root, name);
      try {
        if (!fs.statSync(dir).isDirectory()) continue;
        const jsonPath = path.join(dir, "plugin.json");
        if (!fs.existsSync(jsonPath)) continue;
        const manifest = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const entry = manifest.entry || "index.js";
        const codePath = path.join(dir, entry);
        if (!fs.existsSync(codePath)) continue;
        const id = manifest.id || name;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, dir, manifest, code: fs.readFileSync(codePath, "utf8") });
      } catch {
        /* skip broken plugin */
      }
    }
  }
  return out;
}

function watchPlugins() {
  for (const w of watchers) w.close();
  watchers = [];
  const emit = () => win?.webContents.send("plugins:changed", readPlugins());
  for (const dir of Object.values(pluginsDirs())) {
    try {
      watchers.push(fs.watch(dir, { recursive: true }, emit));
    } catch {
      try {
        watchers.push(fs.watch(dir, emit));
      } catch {
        /* ignore */
      }
    }
  }
}

function panelBounds(show) {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1120, Math.max(720, area.width - 48));
  const height = area.height;
  const y = area.y;
  const shownX = settings.dock === "left" ? area.x : area.x + area.width - width;
  const hiddenX = settings.dock === "left" ? area.x - width : area.x + area.width;
  return { x: show ? shownX : hiddenX, y, width, height };
}

function applyWindow() {
  if (!win) return;
  win.setAlwaysOnTop(Boolean(settings.alwaysOnTop), "screen-saver");
  win.setSkipTaskbar(Boolean(settings.tray) && !visible);
  if (visible && win.isVisible()) win.setBounds(panelBounds(true), true);
}

function showPanel() {
  if (!win) return;
  visible = true;
  win.setSkipTaskbar(false);
  win.setBounds(panelBounds(true), false);
  win.show();
  win.focus();
}

function hidePanel() {
  if (!win) return;
  visible = false;
  win.hide();
  win.setSkipTaskbar(Boolean(settings.tray));
}

function togglePanel() {
  if (!win) return;
  if (visible && win.isVisible()) hidePanel();
  else showPanel();
}

function bindHotkey() {
  globalShortcut.unregisterAll();
  const keys = [settings.hotkey, "Control+Shift+L"].filter(Boolean);
  for (const key of keys) {
    try {
      if (globalShortcut.register(key, togglePanel)) return;
    } catch {
      /* try next */
    }
  }
}

function createTray() {
  const candidates = [res("tray.ico"), res("icon.ico"), path.join(here, "tray.ico"), path.join(here, "icon.ico")];
  let image = nativeImage.createEmpty();
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const next = nativeImage.createFromPath(file);
    if (!next.isEmpty()) {
      image = next;
      break;
    }
  }
  tray = new Tray(image);
  tray.setToolTip("Tyria Ledger");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show", click: showPanel },
      { label: "Hide", click: hidePanel },
      { type: "separator" },
      { label: "Quit", click: () => app.exit(0) },
    ]),
  );
  tray.on("click", togglePanel);
}

function waitForServer(url, tries = 80) {
  return new Promise((resolve, reject) => {
    const tick = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (left <= 0) reject(new Error("App server did not start"));
        else setTimeout(() => tick(left - 1), 250);
      });
    };
    tick(tries);
  });
}

function findServerEntry() {
  const names = [
    res("server", "index.mjs"),
    res("server", "index.js"),
    path.join(here, "server", "index.mjs"),
  ];
  return names.find((file) => fs.existsSync(file)) || null;
}

function startServer() {
  const url = `http://127.0.0.1:${PORT}`;
  if (!app.isPackaged) return url;
  const entry = findServerEntry();
  if (!entry) return url;
  server = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOST: "127.0.0.1",
      NITRO_PORT: String(PORT),
      NITRO_HOST: "127.0.0.1",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  return url;
}

function failHtml(message) {
  const safe = String(message).replace(/[<>&]/g, "");
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><title>Tyria Ledger</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1612;color:#e8e0cc;font:16px/1.5 Segoe UI,sans-serif}
main{max-width:28rem;padding:2rem}
h1{font-size:1.4rem;margin:0 0 .5rem}
p{color:#9a9184}
</style></head>
<body><main><h1>Tyria Ledger</h1><p>${safe}</p></main></body></html>`)}`;
}

async function createWindow() {
  const url = startServer();
  win = new BrowserWindow({
    ...panelBounds(true),
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: "#1a1612",
    icon: iconPath(),
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  applyWindow();
  const target = app.isPackaged ? url : process.env.LEDGER_URL || "http://127.0.0.1:8080";
  try {
    if (app.isPackaged) await waitForServer(url);
    await win.loadURL(target);
  } catch (err) {
    await win.loadURL(failHtml(err instanceof Error ? err.message : "Could not start the overlay."));
  }
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    if (code === -3) return;
    void win?.loadURL(failHtml(desc || "Could not load Tyria Ledger."));
  });
  showPanel();
  win.on("close", (e) => {
    if (settings.tray) {
      e.preventDefault();
      hidePanel();
    }
  });
}

async function runUpdateCheck() {
  try {
    lastVersions = await listVersions(settings.githubToken);
    const target = pickTarget(lastVersions, settings.preferredVersion);
    if (target && !target.current && target.downloadUrl) {
      emitStatus({ state: "ready", message: `${target.label} is ready.` });
      if (settings.autoUpdate) {
        toastUpdate(target, () => {
          void installVersion({
            version: target,
            installDir: settings.installDir || path.dirname(process.execPath),
            token: settings.githubToken,
            onStatus: emitStatus,
          });
        });
      }
      return target;
    }
    emitStatus({ state: "idle", message: "You're on this version." });
    return null;
  } catch (err) {
    emitStatus({ state: "error", message: err instanceof Error ? err.message : "Check failed." });
    return null;
  }
}

ipcMain.handle("desktop:getSettings", () => settings);
ipcMain.handle("desktop:setSettings", (_e, next) => {
  settings = { ...settings, ...next };
  saveSettings();
  applyWindow();
  bindHotkey();
});
ipcMain.handle("plugins:list", () => readPlugins());
ipcMain.handle("plugins:openFolder", async () => {
  const { drop } = pluginsDirs();
  await shell.openPath(drop);
  return drop;
});
ipcMain.handle("desktop:hide", () => {
  hidePanel();
});
ipcMain.handle("updater:version", () => APP_VERSION);
ipcMain.handle("updater:list", async () => {
  emitStatus({ state: "checking", message: "Checking the repo…" });
  try {
    lastVersions = await listVersions(settings.githubToken);
    emitStatus({ state: "idle", message: lastVersions.length ? "Versions loaded." : "No version branches yet." });
    return lastVersions;
  } catch (err) {
    emitStatus({ state: "error", message: err instanceof Error ? err.message : "Could not read versions." });
    throw err;
  }
});
ipcMain.handle("updater:pickFolder", async () => {
  const dir = await pickInstallDir(win, settings.installDir);
  if (dir) {
    settings.installDir = dir;
    saveSettings();
  }
  return dir;
});
ipcMain.handle("updater:install", async (_e, id) => {
  const versions = lastVersions.length ? lastVersions : await listVersions(settings.githubToken);
  lastVersions = versions;
  const version = pickTarget(versions, id || settings.preferredVersion);
  if (!version) throw new Error("No version to install.");
  const dir = settings.installDir || (app.isPackaged ? path.dirname(process.execPath) : "");
  if (!dir) throw new Error("Pick a folder first.");
  settings.installDir = dir;
  saveSettings();
  await installVersion({
    version,
    installDir: dir,
    token: settings.githubToken,
    onStatus: emitStatus,
  });
});
ipcMain.handle("updater:check", () => runUpdateCheck());

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.setAppUserModelId("com.tyrialedger.app");
  app.on("second-instance", showPanel);
  app.whenReady().then(async () => {
    loadSettings();
    if (!settings.installDir && app.isPackaged) {
      settings.installDir = path.dirname(process.execPath);
      saveSettings();
    }
    createTray();
    bindHotkey();
    watchPlugins();
    await createWindow();
    if (settings.autoUpdate) {
      setTimeout(() => {
        void runUpdateCheck();
      }, 4000);
    }
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (server && !server.killed) server.kill();
});
