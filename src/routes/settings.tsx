import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, Puzzle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlugins } from "@/components/plugin-host";
import { formatHotkey } from "@/lib/desktop/settings";
import { loadPluginSettings } from "@/lib/plugins/store";
import type { PluginPack, PluginSettingField } from "@/lib/plugins/types";
import type { LedgerVersion, UpdateStatus } from "@/lib/desktop/protocol";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const {
    settings,
    setSettings,
    packs,
    enabled,
    errors,
    desktop,
    pluginsDir,
    toggleEnabled,
    setPluginSetting,
    installFiles,
    uninstall,
    openPluginsFolder,
  } = usePlugins();
  const [capturing, setCapturing] = useState(false);
  const [dropOn, setDropOn] = useState(false);
  const [dropError, setDropError] = useState("");

  async function onFiles(list: FileList | File[]) {
    setDropError("");
    try {
      await installFiles(Array.from(list));
    } catch (err) {
      setDropError(err instanceof Error ? err.message : "Could not install that plugin.");
    }
  }

  return (
    <AppShell>
      <div className="gw2-banner mb-6 px-4 py-3">
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-foreground/80">
          Overlay, updates, and plugins. Settings stay on this machine.
        </p>
      </div>

      <section className="gw2-well p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">Overlay</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {desktop
            ? "Lives in the tray next to the clock. Hotkey slides the window in from the dock side."
            : "Saved here. Tray and global hotkey run in the desktop app."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Dock
            <span className="mt-2 flex gap-2">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setSettings({ ...settings, dock: side })}
                  className={cn(
                    "h-10 flex-1 border border-border text-sm capitalize",
                    settings.dock === side ? "bg-select text-select-foreground" : "bg-secondary/60",
                  )}
                >
                  {side}
                </button>
              ))}
            </span>
          </label>
          <label className="block text-sm">
            Hotkey
            <Input
              readOnly
              value={capturing ? "Press a combo…" : settings.hotkey}
              onFocus={() => setCapturing(true)}
              onBlur={() => setCapturing(false)}
              onKeyDown={(e) => {
                e.preventDefault();
                const combo = formatHotkey(e.nativeEvent);
                if (!combo) return;
                setSettings({ ...settings, hotkey: combo });
                setCapturing(false);
                e.currentTarget.blur();
              }}
              className="mt-2 font-mono"
              aria-label="Overlay hotkey"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <RowToggle
            on={settings.tray}
            onChange={(tray) => setSettings({ ...settings, tray })}
            label="Minimize to tray"
            hint="Close hides next to the clock instead of quitting"
          />
          <RowToggle
            on={settings.alwaysOnTop}
            onChange={(alwaysOnTop) => setSettings({ ...settings, alwaysOnTop })}
            label="Always on top"
            hint="Stays above the game while the overlay is open"
          />
          <RowToggle
            on={settings.vaultBagsOpen}
            onChange={(vaultBagsOpen) => setSettings({ ...settings, vaultBagsOpen })}
            label="Expand vault bags"
            hint="Bank, mats, shared, and characters start open. Off keeps them collapsed."
          />
        </div>
      </section>

      <UpdateSection />

      <section className="gw2-well mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Plugins</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Bundled, dropped, and anything sitting in the plugins folder. Enable to run.
            </p>
          </div>
          {desktop ? (
            <Button variant="outline" size="sm" onClick={() => void openPluginsFolder()}>
              <FolderOpen className="size-4" />
              Open folder
            </Button>
          ) : null}
        </div>
        {pluginsDir ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">{pluginsDir}</p> : null}

        <label
          onDragEnter={(e) => {
            e.preventDefault();
            setDropOn(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDropOn(true);
          }}
          onDragLeave={() => setDropOn(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropOn(false);
            void onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground",
            dropOn && "border-accent bg-secondary/60 text-foreground",
          )}
        >
          <Puzzle className="mb-2 size-5" />
          Drop a plugin folder here, or click to pick files
          <input
            type="file"
            className="sr-only"
            multiple
            // @ts-expect-error webkitdirectory is nonstandard but what we need
            webkitdirectory=""
            onChange={(e) => {
              if (e.target.files?.length) void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {dropError ? <p className="mt-2 text-sm text-sell">{dropError}</p> : null}
        {errors.length ? (
          <ul className="mt-3 space-y-1 text-sm text-sell">
            {errors.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {packs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No plugins found yet.</p>
          ) : (
            packs.map((pack) => (
              <PluginRow
                key={pack.id}
                pack={pack}
                on={enabled.has(pack.id)}
                onToggle={(value) => toggleEnabled(pack.id, value)}
                onSetting={(key, value) => setPluginSetting(pack.id, key, value)}
                onRemove={pack.source === "drop" ? () => void uninstall(pack.id) : undefined}
              />
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}

function UpdateSection() {
  const { settings, setSettings, desktop } = usePlugins();
  const [versions, setVersions] = useState<LedgerVersion[]>([]);
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle", message: "" });
  const [busy, setBusy] = useState(false);
  const current = window.tyriaDesktop?.version || "web";

  useEffect(() => {
    const off = window.tyriaDesktop?.onUpdateStatus((next) => setStatus(next));
    void load();
    return () => off?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!window.tyriaDesktop) return;
    setBusy(true);
    try {
      const rows = await window.tyriaDesktop.listVersions();
      setVersions(rows);
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Could not read versions." });
    } finally {
      setBusy(false);
    }
  }

  async function pickFolder() {
    const dir = await window.tyriaDesktop?.pickInstallDir();
    if (dir) setSettings({ ...settings, installDir: dir });
  }

  async function install(id: string) {
    if (!window.tyriaDesktop) return;
    if (!settings.installDir) {
      const dir = await window.tyriaDesktop.pickInstallDir();
      if (!dir) return;
      setSettings({ ...settings, installDir: dir });
    }
    setBusy(true);
    try {
      await window.tyriaDesktop.installVersion(id);
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Install failed." });
      setBusy(false);
    }
  }

  const selected = settings.preferredVersion || "latest";

  return (
    <section className="gw2-well mt-6 p-5 sm:p-6">
      <h2 className="font-display text-2xl tracking-tight">Updates</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Versions come from `version-*` branches. Close and install opens the updater window
        so you can see download, unpack, and restart. You pick the folder.
      </p>
      <p className="mt-3 text-sm">
        Running <span className="text-coin-gold">{current}</span>
      </p>
      {!desktop ? (
        <p className="mt-3 text-sm text-muted-foreground">Install and toast alerts run in the desktop app.</p>
      ) : (
        <>
          <label className="mt-4 block text-sm">
            Version
            <select
              className="mt-2 h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm"
              value={selected}
              onChange={(e) => setSettings({ ...settings, preferredVersion: e.target.value })}
            >
              <option value="latest">Latest</option>
              {versions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.latest ? `${row.label} (latest)` : row.label}
                  {row.current ? " — this build" : ""}
                  {!row.downloadUrl ? " — no exe yet" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm">
            Install folder
            <span className="mt-2 flex gap-2">
              <Input readOnly value={settings.installDir || "Not set"} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => void pickFolder()}>
                Browse
              </Button>
            </span>
          </label>
          <div className="mt-4">
            <RowToggle
              on={settings.autoUpdate}
              onChange={(autoUpdate) => setSettings({ ...settings, autoUpdate })}
              label="Watch for updates"
              hint="Windows toast when a newer version is on the repo. Click the toast to install."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
              Refresh list
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void install(selected === "latest" ? versions.find((row) => row.latest)?.id || "" : selected)}
            >
              Close and install
            </Button>
          </div>
          {status.message ? (
            <p className={cn("mt-3 text-sm", status.state === "error" ? "text-sell" : "text-muted-foreground")}>
              {status.message}
              {status.percent != null ? ` ${status.percent}%` : ""}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative isolate h-5 w-9 shrink-0 rounded-full border border-border p-0.5",
        on ? "bg-rail" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "block size-4 rounded-full bg-accent shadow-sm transition-transform duration-150",
          on ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function RowToggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-left">
      <span>
        <span className="block text-sm">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

function PluginRow({
  pack,
  on,
  onToggle,
  onSetting,
  onRemove,
}: {
  pack: PluginPack;
  on: boolean;
  onToggle: (value: boolean) => void;
  onSetting: (key: string, value: unknown) => void;
  onRemove?: () => void;
}) {
  const saved = loadPluginSettings(pack.id);
  const source =
    pack.source === "bundled" ? "Bundled" : pack.source === "disk" ? "Folder" : "Dropped";
  const fields = pack.manifest.settings ?? [];
  return (
    <article className="bg-secondary/20 px-4 py-3">
      <RowToggle
        on={on}
        onChange={onToggle}
        label={pack.manifest.name}
        hint={`${pack.manifest.description}${on ? "  ·  Running" : "  ·  Off"} · v${pack.manifest.version} · ${source}`}
      />
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove plugin"
          onClick={onRemove}
          className="mt-2 text-xs text-muted-foreground hover:text-sell"
        >
          Remove
        </button>
      ) : null}
      {fields.length ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={saved[field.key] ?? field.default}
              onChange={(value) => onSetting(field.key, value)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: PluginSettingField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return <RowToggle on={Boolean(value)} onChange={onChange} label={field.label} hint={field.hint ?? ""} />;
  }
  if (field.type === "sound") {
    const custom = typeof value === "string" && value !== "ding" && value !== "default" && value.length > 0;
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="block text-sm">{field.label}</span>
          <span className="text-xs text-muted-foreground">
            {custom ? "Custom file" : "Default chime"}
            {field.hint ? ` · ${field.hint}` : ""}
          </span>
        </span>
        <span className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange("ding")}>
            Default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const audio = new Audio(custom ? String(value) : "/sounds/chime.wav");
              void audio.play();
            }}
          >
            Preview
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center border border-border bg-secondary px-3 text-xs">
            Browse
            <input
              type="file"
              accept="audio/wav,audio/mpeg,audio/ogg,.wav,.mp3,.ogg"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 750_000) {
                  alert("Keep the sound under 750 KB.");
                  return;
                }
                const data = await file.arrayBuffer();
                const blob = new Blob([data], { type: file.type || "audio/wav" });
                const reader = new FileReader();
                reader.onload = () => onChange(String(reader.result || "ding"));
                reader.readAsDataURL(blob);
              }}
            />
          </label>
        </span>
      </div>
    );
  }
  return (
    <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span>
        <span className="block">{field.label}</span>
        {field.hint ? <span className="text-xs text-muted-foreground">{field.hint}</span> : null}
      </span>
      <Input
        type={field.type === "number" ? "number" : "text"}
        min={field.min}
        max={field.max}
        value={value as string | number | undefined}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className="h-9 w-28"
      />
    </label>
  );
}
