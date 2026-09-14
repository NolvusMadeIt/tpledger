const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tyriaDesktop", {
  isDesktop: true,
  getSettings: () => ipcRenderer.invoke("desktop:getSettings"),
  setSettings: (settings) => ipcRenderer.invoke("desktop:setSettings", settings),
  listPlugins: () => ipcRenderer.invoke("plugins:list"),
  openPluginsFolder: () => ipcRenderer.invoke("plugins:openFolder"),
  hideToTray: () => ipcRenderer.invoke("desktop:hide"),
  onPluginsChanged: (cb) => {
    const listen = (_event, list) => cb(list);
    ipcRenderer.on("plugins:changed", listen);
    return () => ipcRenderer.removeListener("plugins:changed", listen);
  },
});
