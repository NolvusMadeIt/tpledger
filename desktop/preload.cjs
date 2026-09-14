const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tyriaDesktop", {
  isDesktop: true,
  version: "1.0.5",
  getSettings: () => ipcRenderer.invoke("desktop:getSettings"),
  setSettings: (settings) => ipcRenderer.invoke("desktop:setSettings", settings),
  listPlugins: () => ipcRenderer.invoke("plugins:list"),
  openPluginsFolder: () => ipcRenderer.invoke("plugins:openFolder"),
  hideToTray: () => ipcRenderer.invoke("desktop:hide"),
  setClickThrough: (on) => ipcRenderer.send("desktop:clickThrough", on),
  onPluginsChanged: (cb) => {
    const listen = (_event, list) => cb(list);
    ipcRenderer.on("plugins:changed", listen);
    return () => ipcRenderer.removeListener("plugins:changed", listen);
  },
  listVersions: () => ipcRenderer.invoke("updater:list"),
  pickInstallDir: () => ipcRenderer.invoke("updater:pickFolder"),
  installVersion: (id) => ipcRenderer.invoke("updater:install", id),
  checkUpdates: () => ipcRenderer.invoke("updater:check"),
  onUpdateStatus: (cb) => {
    const listen = (_event, status) => cb(status);
    ipcRenderer.on("updater:status", listen);
    return () => ipcRenderer.removeListener("updater:status", listen);
  },
});
