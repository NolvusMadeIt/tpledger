import { app, BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, "desktop.json"), "utf8"));
const payload = path.join(here, "payload");

let child = null;

function waitForServer(url, tries = 60) {
  return new Promise((resolve, reject) => {
    const tick = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (left <= 0) reject(new Error(`App did not start at ${url}`));
        else setTimeout(() => tick(left - 1), 400);
      });
    };
    tick(tries);
  });
}

function startChild() {
  if (config.mode !== "server") return;
  const env = { ...process.env, PORT: String(config.port), HOST: "127.0.0.1" };
  child = spawn(config.command, config.args, {
    cwd: payload,
    env,
    shell: true,
    stdio: "ignore",
  });
}

async function openWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: config.title,
    autoHideMenuBar: true,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  if (config.mode === "file") {
    await win.loadFile(path.join(payload, config.file));
  } else {
    const url = `http://127.0.0.1:${config.port}`;
    await waitForServer(url);
    await win.loadURL(url);
  }
}

app.whenReady().then(async () => {
  startChild();
  await openWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void openWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (child && !child.killed) child.kill();
});
