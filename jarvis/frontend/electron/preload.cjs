const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisDesktop', {
  openApp: (name) => ipcRenderer.invoke('open-app', name),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  listFiles: (dir) => ipcRenderer.invoke('list-files', dir),
  fileExists: (path) => ipcRenderer.invoke('file-exists', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  setWindowSize: (w, h) => ipcRenderer.invoke('set-window-size', w, h),
  minimizeToOrb: () => ipcRenderer.invoke('minimize-to-orb'),
  expandFromOrb: () => ipcRenderer.invoke('expand-from-orb'),
  isElectron: true,
});
