import { emitPluginEvent, onPluginEvent } from "./bus";
import { loadPluginSettings, savePluginSetting } from "./store";
import type { PluginApi, PluginModule, PluginPack } from "./types";

type Running = { stop?: () => void };

const running = new Map<string, Running>();

const DEFAULT_CHIME = "/sounds/chime.wav";

function playSound(src?: string) {
  if (typeof Audio === "undefined") return;
  const url = !src || src === "ding" || src === "default" ? DEFAULT_CHIME : src;
  try {
    const audio = new Audio(url);
    audio.volume = 0.75;
    void audio.play();
  } catch {
    /* autoplay blocked */
  }
}

function notify(title: string, body: string, sound?: string) {
  playSound(sound);
  if (typeof Notification === "undefined") return;
  const show = () => new Notification(title, { body, silent: true });
  if (Notification.permission === "granted") show();
  else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") show();
    });
  }
}

function makeApi(pack: PluginPack): PluginApi {
  const defaults: Record<string, unknown> = {};
  for (const field of pack.manifest.settings ?? []) {
    if (field.default !== undefined) defaults[field.key] = field.default;
  }
  const saved = loadPluginSettings(pack.id);
  const settings = { ...defaults, ...saved };
  return {
    id: pack.id,
    settings,
    getSetting: (key, fallback) => (settings[key] as typeof fallback) ?? fallback,
    setSetting: (key, value) => {
      settings[key] = value;
      savePluginSetting(pack.id, key, value);
    },
    on: onPluginEvent,
    notify: (title, body) => notify(title, body, String(settings.sound || "ding")),
    play: playSound,
    log: (message) => console.info(`[${pack.manifest.name}]`, message),
  };
}

async function loadModule(code: string): Promise<PluginModule> {
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    const mod = (await import(/* @vite-ignore */ url)) as PluginModule;
    return mod;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function startPlugin(pack: PluginPack): Promise<void> {
  await stopPlugin(pack.id);
  const api = makeApi(pack);
  const mod = await loadModule(pack.code);
  const result = await mod.start?.(api);
  running.set(pack.id, {
    stop: () => {
      if (typeof result === "function") result();
      mod.stop?.();
    },
  });
}

export async function stopPlugin(id: string): Promise<void> {
  const row = running.get(id);
  if (!row) return;
  try {
    row.stop?.();
  } catch {
    /* ignore */
  }
  running.delete(id);
}

export async function syncRunning(packs: PluginPack[], enabled: Set<string>): Promise<string[]> {
  const errors: string[] = [];
  for (const id of [...running.keys()]) {
    if (!enabled.has(id) || !packs.some((p) => p.id === id)) await stopPlugin(id);
  }
  for (const pack of packs) {
    if (!enabled.has(pack.id) || running.has(pack.id)) continue;
    try {
      await startPlugin(pack);
    } catch (err) {
      errors.push(`${pack.manifest.name}: ${err instanceof Error ? err.message : "failed to start"}`);
    }
  }
  return errors;
}

export { emitPluginEvent };
