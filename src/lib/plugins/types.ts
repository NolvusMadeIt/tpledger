export type PluginSettingField = {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "sound";
  default?: boolean | number | string;
  min?: number;
  max?: number;
  hint?: string;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  entry?: string;
  settings?: PluginSettingField[];
};

export type PluginPack = {
  id: string;
  manifest: PluginManifest;
  code: string;
  source: "bundled" | "drop" | "disk";
};

export type PluginApi = {
  id: string;
  settings: Record<string, unknown>;
  getSetting: <T>(key: string, fallback: T) => T;
  setSetting: (key: string, value: unknown) => void;
  on: (event: string, fn: (payload: unknown) => void) => () => void;
  notify: (title: string, body: string) => void;
  play: (src?: string) => void;
  log: (message: string) => void;
};

export type PluginModule = {
  start?: (api: PluginApi) => void | (() => void) | Promise<void | (() => void)>;
  stop?: () => void;
};
