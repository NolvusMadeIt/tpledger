#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, "apps");
const resDir = path.join(here, "resources");

function run(cmd, args, cwd = root, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32", env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed ${code}`))));
  });
}

fs.mkdirSync(resDir, { recursive: true });
fs.mkdirSync(out, { recursive: true });

console.log("Building desktop server…");
await run("npm", ["run", "build"], root, { ...process.env, LEDGER_DESKTOP: "1" });

const serverCandidates = [
  path.join(root, ".output", "server"),
  path.join(root, ".output", "server", "index.mjs"),
];
let serverDir = path.join(root, ".output", "server");
if (!fs.existsSync(path.join(serverDir, "index.mjs")) && !fs.existsSync(path.join(serverDir, "index.js"))) {
  throw new Error("Desktop server build missing (.output/server).");
}

const destServer = path.join(resDir, "server");
fs.rmSync(destServer, { recursive: true, force: true });
fs.cpSync(serverDir, destServer, { recursive: true });
const publicDir = path.join(root, ".output", "public");
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(resDir, "public"), { recursive: true });
  fs.cpSync(publicDir, path.join(destServer, "public"), { recursive: true });
}

const pluginsSrc = path.join(root, "public", "plugins");
for (const name of ["icon.ico", "icon.png", "tray.ico"]) {
  const from = path.join(here, name);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(resDir, name));
}

await run("npm", ["install", "--no-save", "electron@37.2.6", "@electron/packager@18.3.6"], here);
const packager = (await import(path.join(here, "node_modules", "@electron/packager", "dist", "index.js"))).default;

console.log("Packing slim Windows build…");
await packager({
  dir: here,
  name: "Tyria Ledger",
  appCopyright: "Tyria Ledger",
  appVersion: "1.0.1",
  electronVersion: "37.2.6",
  out,
  overwrite: true,
  platform: "win32",
  arch: "x64",
  icon: path.join(here, "icon.ico"),
  asar: true,
  prune: true,
  ignore: [/node_modules/, /pack-win\.mjs/, /resources/],
  extraResource: [
    destServer,
    path.join(resDir, "public"),
    pluginsSrc,
    path.join(here, "icon.ico"),
    path.join(here, "icon.png"),
    path.join(here, "tray.ico"),
  ].filter((file) => fs.existsSync(file)),
});

const built = fs.readdirSync(out).find((name) => name.includes("win32"));
if (built) {
  const dest = path.join(out, built);
  const drop = path.join(dest, "plugins");
  fs.mkdirSync(drop, { recursive: true });
  fs.cpSync(pluginsSrc, drop, { recursive: true });
  fs.writeFileSync(
    path.join(dest, "README.txt"),
    "Tyria Ledger\n\nRun Tyria Ledger.exe\nClose or Control+Shift+L hides it next to the clock.\nDrop plugins into the plugins folder.\n",
  );
  console.log("Built", dest);
}
