#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, "apps");
const resDir = path.join(here, "resources");

function run(cmd, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed ${code}`))));
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function copyTree(from, to, skip) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (skip.has(name)) continue;
    const a = path.join(from, name);
    const b = path.join(to, name);
    const st = fs.lstatSync(a);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) copyTree(a, b, skip);
    else fs.copyFileSync(a, b);
  }
}

fs.mkdirSync(resDir, { recursive: true });
fs.mkdirSync(out, { recursive: true });

if (!fs.existsSync(path.join(root, ".vercel", "output"))) {
  console.log("Building web app…");
  await run("npm", ["run", "build"]);
}

const nodeExe = path.join(resDir, "node.exe");
if (!fs.existsSync(nodeExe)) {
  console.log("Fetching Windows node.exe…");
  await download("https://nodejs.org/dist/v22.14.0/win-x64/node.exe", nodeExe);
}

const payloadDest = path.join(resDir, "payload");
fs.rmSync(payloadDest, { recursive: true, force: true });
console.log("Copying app payload…");
copyTree(
  root,
  payloadDest,
  new Set([
    ".git",
    "apps",
    "convert",
    "desktop",
    "screenshots",
    "attachments",
    "artifacts",
    ".grok",
    ".cache",
  ]),
);

const pluginsSrc = path.join(root, "public", "plugins");
if (!fs.existsSync(path.join(here, "icon.png"))) {
  fs.copyFileSync(path.join(root, "public", "icon.png"), path.join(here, "icon.png"));
}

await run("npm", ["install", "--no-save", "electron@37.2.6", "@electron/packager@18.3.6"], here);

const packager = (await import(path.join(here, "node_modules", "@electron/packager", "dist", "index.js"))).default;
console.log("Packing Windows exe…");
await packager({
  dir: here,
  name: "Tyria Ledger",
  appCopyright: "Tyria Ledger",
  appVersion: "1.0.0",
  electronVersion: "37.2.6",
  out,
  overwrite: true,
  platform: "win32",
  arch: "x64",
  icon: path.join(here, "icon.ico"),
  asar: false,
  prune: false,
  ignore: [/node_modules/, /pack-win\.mjs/, /resources/],
  extraResource: [nodeExe, payloadDest, pluginsSrc, path.join(here, "icon.ico"), path.join(here, "icon.png")],
});

const built = fs.readdirSync(out).find((name) => name.includes("win32"));
if (built) {
  const dest = path.join(out, built);
  const drop = path.join(dest, "plugins");
  fs.mkdirSync(drop, { recursive: true });
  fs.cpSync(pluginsSrc, drop, { recursive: true });
  fs.writeFileSync(
    path.join(dest, "README.txt"),
    "Tyria Ledger\n\nDouble-click Tyria Ledger.exe\nClose or the hotkey hides it next to the clock.\nDrop plugins into the plugins folder, then enable them in Options.\nDefault hotkey: Control+Shift+L\n",
  );
  console.log("Built", dest);
}
