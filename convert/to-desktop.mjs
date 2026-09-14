#!/usr/bin/env node
/**
 * Drop a project folder onto this kit (or: node to-desktop.mjs /path/to/app)
 * and get a Windows / Mac desktop build in ../apps.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const convertDir = path.dirname(fileURLToPath(import.meta.url));
const appsDir = path.resolve(convertDir, "..", "apps");
const electronDir = path.join(convertDir, "electron");

const dropped = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("-")));
if (!dropped.length) {
  console.error("Drop a project folder onto \u201cDrop folder here\u201d, or run:");
  console.error("  node to-desktop.mjs /path/to/app");
  process.exit(1);
}

const src = path.resolve(dropped[0]);
if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
  console.error("Not a folder:", src);
  process.exit(1);
}

const pkgPath = path.join(src, "package.json");
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : {};
const title = String(pkg.productName || pkg.name || path.basename(src))
  .replace(/^app-builder-workspace$/i, "Tyria Ledger")
  .replace(/[-_]+/g, " ")
  .replace(/\b\w/g, (c) => c.toUpperCase());
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "desktop-app";

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} failed (${code})`))));
  });
}

function exists(file) {
  return fs.existsSync(path.join(src, file));
}

async function npmInstallIfNeeded() {
  if (!fs.existsSync(pkgPath)) return;
  if (!fs.existsSync(path.join(convertDir, "node_modules", "@electron", "packager"))) {
    console.log("Installing converter\u2026");
    await run("npm", ["install"], convertDir);
  }
  if (!fs.existsSync(path.join(src, "node_modules")) && pkg.dependencies) {
    console.log("Installing app dependencies\u2026");
    await run("npm", ["install"], src);
  }
  if (pkg.scripts?.build) {
    console.log("Building app\u2026");
    try {
      await run("npm", ["run", "build"], src);
    } catch {
      console.warn("Build failed \u2014 wrapping the folder as-is.");
    }
  }
}

function planLaunch() {
  const htmlCandidates = ["index.html", "dist/index.html", "build/index.html", "out/index.html", ".output/public/index.html"];
  const html = htmlCandidates.find(exists);
  if (pkg.scripts?.preview) {
    return { mode: "server", command: "npm", args: ["run", "preview", "--", "--host", "127.0.0.1", "--port", "17331"], port: 17331 };
  }
  if (pkg.scripts?.start) {
    return { mode: "server", command: "npm", args: ["start"], port: 17331 };
  }
  if (html) {
    return { mode: "file", file: html.replace(/\\/g, "/") };
  }
  throw new Error("No index.html, npm start, or npm preview in that folder.");
}

function copyPayload(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const skip = new Set([".git", "convert", "apps", "screenshots", "attachments", "artifacts", ".grok"]);
  function walk(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      if (skip.has(name)) continue;
      if (name === "node_modules" && !pkg.scripts?.preview && !pkg.scripts?.start) continue;
      const a = path.join(from, name);
      const b = path.join(to, name);
      const st = fs.lstatSync(a);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(a, b);
      else fs.copyFileSync(a, b);
    }
  }
  walk(src, dest);
}

async function pack(stage) {
  const packager = (await import("@electron/packager")).default;
  const platforms = [];
  if (flags.has("--win") || flags.has("--all") || process.platform === "win32") platforms.push("win32");
  if (flags.has("--mac") || flags.has("--all") || process.platform === "darwin") platforms.push("darwin");
  if (!platforms.length) platforms.push(process.platform === "darwin" ? "darwin" : "win32");

  fs.mkdirSync(appsDir, { recursive: true });
  const arch = os.arch() === "arm64" ? "arm64" : "x64";
  console.log(`Packing ${title} \u2192 ${appsDir}`);
  await packager({
    dir: stage,
    out: appsDir,
    name: title,
    appBundleId: `com.tpledger.${slug}`,
    overwrite: true,
    prune: false,
    platform: platforms,
    arch,
    asar: false,
    ignore: [/node_modules\/\.bin/],
  });
}

await npmInstallIfNeeded();
const launch = planLaunch();
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "drop-to-desktop-"));
try {
  for (const name of ["main.mjs", "package.json"]) {
    fs.copyFileSync(path.join(electronDir, name), path.join(stage, name));
  }
  fs.writeFileSync(path.join(stage, "desktop.json"), JSON.stringify({ title, ...launch }, null, 2));
  fs.writeFileSync(
    path.join(stage, "package.json"),
    JSON.stringify({ name: slug, productName: title, private: true, type: "module", main: "main.mjs" }, null, 2),
  );
  copyPayload(path.join(stage, "payload"));
  await pack(stage);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

console.log(`\nDone. Desktop builds are in:\n  ${appsDir}\n`);
console.log("Windows: open the folder ending in -win32- and run the .exe");
console.log("Mac: open the folder ending in -darwin- and launch the .app");
