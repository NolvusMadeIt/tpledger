export type DockSide = "left" | "right";

export type AppSettings = {
  dock: DockSide;
  hotkey: string;
  tray: boolean;
  alwaysOnTop: boolean;
  installDir: string;
  autoUpdate: boolean;
  preferredVersion: string;
  githubToken: string;
};

const KEY = "tyria-ledger.desktop";

export const DEFAULT_SETTINGS: AppSettings = {
  dock: "right",
  hotkey: "Control+Shift+L",
  tray: true,
  alwaysOnTop: true,
  installDir: "",
  autoUpdate: true,
  preferredVersion: "latest",
  githubToken: "",
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      dock: parsed.dock === "left" ? "left" : "right",
      hotkey: typeof parsed.hotkey === "string" && parsed.hotkey ? parsed.hotkey : DEFAULT_SETTINGS.hotkey,
      tray: parsed.tray !== false,
      alwaysOnTop: parsed.alwaysOnTop !== false,
      installDir: typeof parsed.installDir === "string" ? parsed.installDir : "",
      autoUpdate: parsed.autoUpdate !== false,
      preferredVersion: typeof parsed.preferredVersion === "string" && parsed.preferredVersion
        ? parsed.preferredVersion
        : "latest",
      githubToken: typeof parsed.githubToken === "string" ? parsed.githubToken : "",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.tyriaDesktop?.setSettings(next);
}

export function formatHotkey(e: KeyboardEvent): string | null {
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!key || key === "Unidentified") return null;
  parts.push(key === " " ? "Space" : key);
  return parts.join("+");
}
