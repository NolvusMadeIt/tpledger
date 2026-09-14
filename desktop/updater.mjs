import { app, dialog, Notification, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";

const REPO = "NolvusMadeIt/tpledger";
const VERSION_RE = /^version[-/]v?(\d+\.\d+\.\d+)$/i;
export const APP_VERSION = "1.0.5";

function ghHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TyriaLedger",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: ghHeaders(token) }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(res.statusCode === 404 ? "Repo not found or private." : `GitHub ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
  });
}

function cmpVer(a, b) {
  const pa = a.split(".").map((n) => Number(n) || 0);
  const pb = b.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
}

export async function listVersions(token) {
  const [branches, releases] = await Promise.all([
    getJson(`https://api.github.com/repos/${REPO}/branches?per_page=100`, token),
    getJson(`https://api.github.com/repos/${REPO}/releases?per_page=30`, token).catch(() => []),
  ]);
  const releaseByVer = new Map();
  for (const rel of Array.isArray(releases) ? releases : []) {
    const tag = String(rel.tag_name || "").replace(/^v/, "");
    const asset = (rel.assets || []).find((row) => /win64|win32|\.zip$/i.test(row.name));
    if (tag) {
      releaseByVer.set(tag, {
        tag: rel.tag_name,
        url: asset?.browser_download_url || null,
      });
    }
  }
  const seen = new Set();
  const out = [];
  for (const branch of Array.isArray(branches) ? branches : []) {
    const match = String(branch.name || "").match(VERSION_RE);
    if (!match) continue;
    const ver = match[1];
    if (seen.has(ver)) continue;
    seen.add(ver);
    const rel = releaseByVer.get(ver);
    out.push({
      id: ver,
      label: ver,
      branch: branch.name,
      tag: rel?.tag || null,
      downloadUrl: rel?.url || null,
      current: ver === APP_VERSION,
      latest: false,
    });
  }
  for (const [ver, rel] of releaseByVer) {
    if (seen.has(ver)) continue;
    seen.add(ver);
    out.push({
      id: ver,
      label: ver,
      branch: `version-${ver}`,
      tag: rel.tag,
      downloadUrl: rel.url,
      current: ver === APP_VERSION,
      latest: false,
    });
  }
  out.sort((a, b) => cmpVer(a.id, b.id));
  if (out[0]) out[0].latest = true;
  return out;
}

export function pickTarget(versions, preferred) {
  if (!versions.length) return null;
  if (preferred && preferred !== "latest") {
    return versions.find((row) => row.id === preferred) || versions[0];
  }
  return versions[0];
}

function downloadFile(url, dest, token, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const go = (target) => {
      const req = https.get(target, { headers: ghHeaders(token) }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          go(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed (${res.statusCode})`));
          return;
        }
        const total = Number(res.headers["content-length"] || 0);
        let got = 0;
        res.on("data", (chunk) => {
          got += chunk.length;
          if (total) onProgress?.(Math.round((got / total) * 100));
        });
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      });
      req.on("error", reject);
    };
    go(url);
  });
}

export async function pickInstallDir(win, current) {
  const result = await dialog.showOpenDialog(win ?? undefined, {
    title: "Where should Tyria Ledger live?",
    defaultPath: current || app.getPath("desktop"),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

export async function installVersion({ version, installDir, token, onStatus }) {
  if (!version?.downloadUrl) throw new Error("That version has no Windows build yet.");
  if (!installDir) throw new Error("Pick a folder first.");
  fs.mkdirSync(installDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tyria-"));
  const zip = path.join(tmp, "TyriaLedger-win64.zip");
  onStatus?.({ state: "downloading", message: `Downloading ${version.label}…`, percent: 0 });
  await downloadFile(version.downloadUrl, zip, token, (percent) => {
    onStatus?.({ state: "downloading", message: `Downloading ${version.label}…`, percent });
  });
  onStatus?.({ state: "installing", message: "Closing so the update can install…" });

  const job = {
    pid: process.pid,
    zip,
    unpack: path.join(tmp, "unpack"),
    dest: installDir,
    exe: path.join(installDir, "Tyria Ledger.exe"),
    log: path.join(os.tmpdir(), "tyria-ledger-update.log"),
  };
  const jobPath = path.join(tmp, "job.json");
  const ps1 = path.join(tmp, "update.ps1");
  const vbs = path.join(os.tmpdir(), "tyria-ledger-update.vbs");
  fs.writeFileSync(jobPath, JSON.stringify(job));
  fs.writeFileSync(
    ps1,
    [
      "$ErrorActionPreference = 'Stop'",
      `$job = Get-Content -LiteralPath '${jobPath.replace(/'/g, "''")}' -Raw | ConvertFrom-Json`,
      "function Log($m) { Add-Content -LiteralPath $job.log -Value ((Get-Date -Format o) + ' ' + $m) }",
      "Log ('waiting for PID ' + $job.pid)",
      "while (Get-Process -Id $job.pid -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 400 }",
      "Start-Sleep -Milliseconds 1200",
      "Log 'unpack'",
      "New-Item -ItemType Directory -Force -Path $job.unpack | Out-Null",
      "Expand-Archive -LiteralPath $job.zip -DestinationPath $job.unpack -Force",
      "$root = Get-ChildItem -LiteralPath $job.unpack -Directory | Select-Object -First 1",
      "if ($root) { $from = Join-Path $root.FullName '*' } else { $from = Join-Path $job.unpack '*' }",
      "New-Item -ItemType Directory -Force -Path $job.dest | Out-Null",
      "Copy-Item -Path $from -Destination $job.dest -Recurse -Force",
      "Log 'start'",
      "Start-Process -FilePath $job.exe",
      "Log 'done'",
    ].join("\r\n"),
  );
  const ps =
    process.env.SystemRoot
      ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
      : "powershell.exe";
  const cmd = `"${ps}" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${ps1}"`;
  fs.writeFileSync(vbs, `CreateObject("Wscript.Shell").Run ${JSON.stringify(cmd)}, 0, False\r\n`);
  const child = spawn("wscript.exe", ["//B", "//Nologo", vbs], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: false,
  });
  child.unref();
  setTimeout(() => app.exit(0), 500);
}

export function toastUpdate(version, onClick) {
  if (!Notification.isSupported()) return;
  const note = new Notification({
    title: "Tyria Ledger",
    body: `${version.label} is ready. Click to close and install.`,
  });
  note.on("click", () => onClick?.(version));
  note.show();
}

export function openReleasePage() {
  return shell.openExternal(`https://github.com/${REPO}/releases`);
}
