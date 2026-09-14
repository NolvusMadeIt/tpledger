import type { AppSettings } from "./settings";
import type { PluginManifest } from "@/lib/plugins/types";

export type DiskPlugin = {
  id: string;
  dir: string;
  manifest: PluginManifest;
  code: string;
};

export type LedgerVersion = {
  id: string;
  label: string;
  branch: string;
  tag: string | null;
  downloadUrl: string | null;
  current: boolean;
  latest: boolean;
};

export type UpdateStatus = {
  state: "idle" | "checking" | "ready" | "downloading" | "installing" | "error";
  message: string;
  percent?: number;
};

export type TyriaDesktop = {
  isDesktop: true;
  version: string;
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: AppSettings) => Promise<void>;
  listPlugins: () => Promise<DiskPlugin[]>;
  openPluginsFolder: () => Promise<string>;
  hideToTray: () => Promise<void>;
  onPluginsChanged: (cb: (list: DiskPlugin[]) => void) => () => void;
  listVersions: () => Promise<LedgerVersion[]>;
  pickInstallDir: () => Promise<string | null>;
  installVersion: (id: string) => Promise<void>;
  checkUpdates: () => Promise<LedgerVersion | null>;
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void;
};

declare global {
  interface Window {
    tyriaDesktop?: TyriaDesktop;
  }
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.tyriaDesktop?.isDesktop);
}
