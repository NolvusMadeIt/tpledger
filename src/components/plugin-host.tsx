import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/desktop/settings";
import { loadBundled, packFromFiles } from "@/lib/plugins/catalog";
import { listDropped, loadEnabled, putDropped, removeDropped, saveEnabled, savePluginSetting } from "@/lib/plugins/store";
import { syncRunning } from "@/lib/plugins/runtime";
import type { PluginPack } from "@/lib/plugins/types";

type Ctx = {
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  packs: PluginPack[];
  enabled: Set<string>;
  errors: string[];
  desktop: boolean;
  pluginsDir: string | null;
  toggleEnabled: (id: string, on: boolean) => void;
  setPluginSetting: (id: string, key: string, value: unknown) => void;
  installFiles: (files: File[]) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  openPluginsFolder: () => Promise<void>;
  reload: () => Promise<void>;
};

const PluginContext = createContext<Ctx | null>(null);

export function PluginHost({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [packs, setPacks] = useState<PluginPack[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>(() => loadEnabled());
  const [errors, setErrors] = useState<string[]>([]);
  const [pluginsDir, setPluginsDir] = useState<string | null>(null);
  const desktop = typeof window !== "undefined" && Boolean(window.tyriaDesktop);

  const reload = useCallback(async () => {
    const [bundled, dropped, disk] = await Promise.all([
      loadBundled(),
      listDropped(),
      window.tyriaDesktop ? window.tyriaDesktop.listPlugins() : Promise.resolve([]),
    ]);
    const map = new Map<string, PluginPack>();
    for (const pack of bundled) map.set(pack.id, pack);
    for (const pack of dropped) map.set(pack.id, pack);
    for (const row of disk) {
      map.set(row.id, { id: row.id, manifest: row.manifest, code: row.code, source: "disk" });
    }
    const next = [...map.values()].sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
    setPacks(next);
    const enabled = new Set(loadEnabled());
    const startErrors = await syncRunning(next, enabled);
    setErrors(startErrors);
  }, []);

  useEffect(() => {
    void reload();
    const desk = window.tyriaDesktop;
    if (!desk) return;
    void desk.getSettings().then((remote) => {
      setSettingsState((prev) => ({ ...prev, ...remote }));
    });
    const off = desk.onPluginsChanged(() => {
      void reload();
    });
    return off;
  }, [reload]);

  useEffect(() => {
    document.documentElement.dataset.dock = settings.dock;
    document.documentElement.dataset.overlay = desktop ? "1" : "0";
    saveSettings(settings);
  }, [settings, desktop]);

  const enabled = useMemo(() => new Set(enabledIds), [enabledIds]);

  const setSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  const toggleEnabled = useCallback(
    (id: string, on: boolean) => {
      if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      setEnabledIds((prev) => {
        const next = on ? [...new Set([...prev, id])] : prev.filter((row) => row !== id);
        saveEnabled(next);
        void syncRunning(packs, new Set(next)).then(setErrors);
        return next;
      });
    },
    [packs],
  );

  const setPluginSetting = useCallback((id: string, key: string, value: unknown) => {
    savePluginSetting(id, key, value);
    const pack = packs.find((row) => row.id === id);
    if (pack && enabled.has(id)) {
      void syncRunning(packs, enabled).then(setErrors);
    }
  }, [packs, enabled]);

  const installFiles = useCallback(
    async (files: File[]) => {
      const pack = await packFromFiles(files);
      await putDropped(pack);
      const nextEnabled = [...new Set([...loadEnabled(), pack.id])];
      saveEnabled(nextEnabled);
      setEnabledIds(nextEnabled);
      await reload();
    },
    [reload],
  );

  const uninstall = useCallback(
    async (id: string) => {
      await removeDropped(id);
      const nextEnabled = loadEnabled().filter((row) => row !== id);
      saveEnabled(nextEnabled);
      setEnabledIds(nextEnabled);
      await reload();
    },
    [reload],
  );

  const openPluginsFolder = useCallback(async () => {
    if (!window.tyriaDesktop) return;
    const dir = await window.tyriaDesktop.openPluginsFolder();
    setPluginsDir(dir);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
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
      reload,
    }),
    [
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
      reload,
    ],
  );

  return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
}

export function usePlugins(): Ctx {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error("PluginHost missing");
  return ctx;
}
