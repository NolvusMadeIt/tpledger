import type { PluginManifest, PluginPack } from "./types";

export async function loadBundled(): Promise<PluginPack[]> {
  try {
    const res = await fetch("/plugins/index.json", { cache: "no-store" });
    if (!res.ok) return [];
    const ids = (await res.json()) as string[];
    const packs: PluginPack[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const manifestRes = await fetch(`/plugins/${id}/plugin.json`, { cache: "no-store" });
        if (!manifestRes.ok) return;
        const manifest = (await manifestRes.json()) as PluginManifest;
        const entry = manifest.entry || "index.js";
        const codeRes = await fetch(`/plugins/${id}/${entry}`, { cache: "no-store" });
        if (!codeRes.ok) return;
        packs.push({
          id: manifest.id || id,
          manifest: { ...manifest, id: manifest.id || id },
          code: await codeRes.text(),
          source: "bundled",
        });
      }),
    );
    return packs.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  } catch {
    return [];
  }
}

export async function packFromFiles(files: File[]): Promise<PluginPack> {
  const list = files.filter((file) => file.name !== ".DS_Store");
  const jsonFile = list.find((file) => file.name === "plugin.json" || file.webkitRelativePath.endsWith("/plugin.json"));
  if (!jsonFile) throw new Error("Drop a plugin folder that contains plugin.json.");
  const manifest = JSON.parse(await jsonFile.text()) as PluginManifest;
  if (!manifest.id || !manifest.name) throw new Error("plugin.json needs id and name.");
  const entry = manifest.entry || "index.js";
  const codeFile = list.find((file) => file.name === entry || file.webkitRelativePath.endsWith(`/${entry}`));
  if (!codeFile) throw new Error(`Missing ${entry}.`);
  return {
    id: manifest.id,
    manifest,
    code: await codeFile.text(),
    source: "drop",
  };
}
