#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, "apps");
const resDir = path.join(here, "resources");
const APP_VERSION = "1.0.6";

function run(cmd, args, cwd = root, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32", env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed ${code}`))));
  });
}

function certConfig() {
  const pfx =
    process.env.WINDOWS_CERT_PFX ||
    (fs.existsSync(path.join(here, "certs", "codesign.pfx")) ? path.join(here, "certs", "codesign.pfx") : "");
  const passFile = path.join(here, "certs", "password.txt");
  const password =
    process.env.WINDOWS_CERT_PASSWORD ||
    (fs.existsSync(passFile) ? fs.readFileSync(passFile, "utf8").trim() : "");
  return { pfx, password };
}

function ensureOsslSigncode() {
  const hit = spawnSync("osslsigncode", ["-v"], { encoding: "utf8" });
  if (hit.error || (hit.status !== 0 && hit.status !== 1 && !`${hit.stdout}${hit.stderr}`.toLowerCase().includes("osslsigncode"))) {
    throw new Error("osslsigncode is missing. Install it to sign the Windows exe.");
  }
}

function signFile(file, pfx, password) {
  const tmp = `${file}.signed`;
  const args = [
    "sign",
    "-pkcs12",
    pfx,
    "-n",
    "Tyria Ledger",
    "-i",
    "https://github.com/NolvusMadeIt/tpledger",
    "-t",
    "http://timestamp.digicert.com",
    "-h",
    "sha256",
    "-in",
    file,
    "-out",
    tmp,
  ];
  if (password) args.splice(4, 0, "-pass", password);
  const result = spawnSync("osslsigncode", args, { encoding: "utf8" });
  if (result.status !== 0 || !fs.existsSync(tmp)) {
    throw new Error(result.stderr || result.stdout || `Could not sign ${path.basename(file)}`);
  }
  fs.renameSync(tmp, file);
  console.log("Signed", path.basename(file));
}

function signBuild(dir) {
  const { pfx, password } = certConfig();
  if (!pfx) {
    console.warn("No codesign cert — SmartScreen will show Unknown publisher.");
    console.warn("See desktop/SIGNING.md");
    return false;
  }
  if (!fs.existsSync(pfx)) throw new Error(`Certificate not found: ${pfx}`);
  ensureOsslSigncode();
  const exe = path.join(dir, "Tyria Ledger.exe");
  if (!fs.existsSync(exe)) throw new Error("Tyria Ledger.exe missing after pack");
  signFile(exe, pfx, password);
  return true;
}

fs.mkdirSync(resDir, { recursive: true });
fs.mkdirSync(out, { recursive: true });

console.log("Building desktop server…");
await run("npm", ["run", "build"], root, { ...process.env, LEDGER_DESKTOP: "1" });

const serverDir = path.join(root, ".output", "server");
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
  appVersion: APP_VERSION,
  electronVersion: "37.2.6",
  out,
  overwrite: true,
  platform: "win32",
  arch: "x64",
  icon: path.join(here, "icon.ico"),
  asar: true,
  prune: true,
  ignore: [/node_modules/, /pack-win\.mjs/, /resources/, /certs/],
  win32metadata: {
    CompanyName: "Tyria Ledger",
    FileDescription: "Tyria Ledger",
    ProductName: "Tyria Ledger",
    InternalName: "TyriaLedger",
    OriginalFilename: "Tyria Ledger.exe",
  },
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
  const signed = signBuild(dest);
  fs.writeFileSync(
    path.join(dest, "README.txt"),
    signed
      ? "Tyria Ledger\n\nRun Tyria Ledger.exe\nClose or Control+Shift+L hides it next to the clock.\nDrop plugins into the plugins folder.\n"
      : "Tyria Ledger\n\nWindows may show SmartScreen (Unknown publisher) until this build is code-signed.\nClick More info, then Run anyway.\n\nClose or Control+Shift+L hides it next to the clock.\nDrop plugins into the plugins folder.\n",
  );
  console.log("Built", dest, signed ? "(signed)" : "(unsigned)");
}
