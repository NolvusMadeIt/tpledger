import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 17331;
const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");

const DEFAULTS = {
  dock: "right",
  hotkey: "Control+Shift+L",
  tray: true,
  alwaysOnTop: true,
};

let win = null;
let tray = null;
let server = null;
let visible = true;
let settings = { ...DEFAULTS };
let watchers = [];

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

function iconPath() {
  const ico = path.join(here, "icon.ico");
  const png = path.join(here, "icon.png");
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return path.join(here, "icon.ico");
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
  const out = [];
  for (const root of [drop, user]) {
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
        out.push({
          id: manifest.id || name,
          dir,
          manifest,
          code: fs.readFileSync(codePath, "utf8"),
        });
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
  win.setSkipTaskbar(Boolean(settings.tray));
  win.setBounds(panelBounds(visible), true);
}

function showPanel() {
  if (!win) return;
  visible = true;
  win.setBounds(panelBounds(false), false);
  win.show();
  win.setBounds(panelBounds(true), true);
  win.focus();
}

function hidePanel() {
  if (!win) return;
  visible = false;
  win.setBounds(panelBounds(false), true);
  setTimeout(() => {
    if (!visible) win?.hide();
  }, 180);
}

function togglePanel() {
  if (!win) return;
  if (visible && win.isVisible()) hidePanel();
  else showPanel();
}

function bindHotkey() {
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(settings.hotkey, togglePanel);
  } catch {
    try {
      globalShortcut.register("Control+Shift+L", togglePanel);
    } catch {
      /* none */
    }
  }
}

function createTray() {
  const image = nativeImage.createFromPath(iconPath());
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 }));
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

function startServer() {
  const url = `http://127.0.0.1:${PORT}`;
  if (!app.isPackaged) {
    return url;
  }
  const resDir = process.resourcesPath;
  const node = path.join(resDir, "node.exe");
  const payload = path.join(resDir, "payload");
  const cmd = fs.existsSync(node) ? node : "node";
  if (fs.existsSync(path.join(payload, "package.json"))) {
    const viteJs = path.join(payload, "node_modules", "vite", "bin", "vite.js");
    server = spawn(cmd, [viteJs, "preview", "--host", "127.0.0.1", "--port", String(PORT)], {
      cwd: payload,
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
      stdio: "ignore",
      windowsHide: true,
    });
    return url;
  }
  return url;
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
  try {
    if (app.isPackaged) await waitForServer(url);
  } catch {
    /* still try */
  }
  const target = app.isPackaged ? url : process.env.LEDGER_URL || "http://127.0.0.1:8080";
  await win.loadURL(target);
  showPanel();
  win.on("close", (e) => {
    if (settings.tray) {
      e.preventDefault();
      hidePanel();
    }
  });
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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", showPanel);
  app.whenReady().then(async () => {
    loadSettings();
    createTray();
    bindHotkey();
    watchPlugins();
    await createWindow();
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (server && !server.killed) server.kill();
});
