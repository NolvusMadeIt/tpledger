import type { AppSettings } from "./settings";
import type { PluginManifest } from "@/lib/plugins/types";

export type DiskPlugin = {
  id: string;
  dir: string;
  manifest: PluginManifest;
  code: string;
};

export type TyriaDesktop = {
  isDesktop: true;
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<void>;
  listPlugins: () => Promise<DiskPlugin[]>;
  openPluginsFolder: () => Promise<string>;
  hideToTray: () => Promise<void>;
  onPluginsChanged: (cb: (list: DiskPlugin[]) => void) => () => void;
};

declare global {
  interface Window {
    tyriaDesktop?: TyriaDesktop;
  }
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.tyriaDesktop?.isDesktop);
}
