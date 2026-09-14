import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, Puzzle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlugins } from "@/components/plugin-host";
import { formatHotkey } from "@/lib/desktop/settings";
import { loadPluginSettings } from "@/lib/plugins/store";
import type { PluginPack, PluginSettingField } from "@/lib/plugins/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/options")({
  component: OptionsPage,
});

function OptionsPage() {
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
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Options</h1>
        <p className="mt-1 text-sm text-foreground/80">
          Overlay dock, tray hotkey, and plugins. Drop a plugin folder to install it.
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
        </div>
      </section>

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
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-border",
        on ? "bg-rail" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-accent transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
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
  return (
    <article className="bg-secondary/20 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-sm font-medium">{pack.manifest.name}</h3>
            <span className="text-[11px] text-muted-foreground">v{pack.manifest.version}</span>
            <span className="text-[11px] text-coin-gold">{source}</span>
            {on ? (
              <span className="text-[11px] text-buy">Running</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Off</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{pack.manifest.description}</p>
        </div>
        <Switch on={on} onChange={onToggle} label={`Enable ${pack.manifest.name}`} />
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove plugin"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-sell"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      {on && pack.manifest.settings?.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {pack.manifest.settings.map((field) => (
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
    return (
      <RowToggle on={Boolean(value)} onChange={onChange} label={field.label} hint={field.hint ?? ""} />
    );
  }
  return (
    <label className="block text-xs text-muted-foreground">
      {field.label}
      <Input
        type={field.type === "number" ? "number" : "text"}
        min={field.min}
        max={field.max}
        value={value as string | number | undefined}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 h-9"
      />
      {field.hint ? <span className="mt-1 block">{field.hint}</span> : null}
    </label>
  );
}
