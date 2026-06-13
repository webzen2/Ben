const { app, BrowserWindow, ipcMain, shell, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';

const APP_ALIASES = {
  'chrome': { mac: 'Google Chrome', win: 'chrome', linux: 'google-chrome' },
  'firefox': { mac: 'Firefox', win: 'firefox', linux: 'firefox' },
  'safari': { mac: 'Safari' },
  'slack': { mac: 'Slack', win: 'slack', linux: 'slack' },
  'discord': { mac: 'Discord', win: 'discord', linux: 'discord' },
  'spotify': { mac: 'Spotify', win: 'spotify', linux: 'spotify' },
  'vscode': { mac: 'Visual Studio Code', win: 'code', linux: 'code' },
  'code': { mac: 'Visual Studio Code', win: 'code', linux: 'code' },
  'terminal': { mac: 'Terminal', win: 'cmd', linux: 'gnome-terminal' },
  'finder': { mac: 'Finder' },
  'claude': { url: 'https://claude.ai' },
  'youtube': { url: 'https://youtube.com' },
  'github': { url: 'https://github.com' },
  'twitter': { url: 'https://twitter.com' },
  'x': { url: 'https://x.com' },
  'gmail': { url: 'https://mail.google.com' },
  'calendar': { url: 'https://calendar.google.com' },
  'notion': { mac: 'Notion', url: 'https://notion.so' },
  'figma': { url: 'https://figma.com' },
  'ghl': { url: 'https://app.gohighlevel.com' },
  'gohighlevel': { url: 'https://app.gohighlevel.com' },
  'make': { url: 'https://make.com' },
  'vercel': { url: 'https://vercel.com/dashboard' },
  'supabase': { url: 'https://app.supabase.com' },
  'instagram': { url: 'https://instagram.com' },
  'facebook': { url: 'https://facebook.com' },
  'my website': { url: 'https://bcautomations.vercel.app' },
  'bcautomations': { url: 'https://bcautomations.vercel.app' },
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 300,
    minHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Start in bottom-right corner
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(width - 440, height - 720);

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABGJJREFUWEftl11oXFUQx//n3N1Nsin5aJq0TZOmsdZqFWytoFQUfBBBKIig+CCKD4ovIoIPvvigiIhY8EFEUBAU8UEQBaWItFSrWLVaP2qTNmm+m+xmd7O79+7ec2bkbLJJdrNJtmB9yMDC3j0z8z9zZv4zS/jPH/qP48cawFoVuAkgJ8BnPpfVOAEgJMAlgH8CuBkk1bg8cceo2tvuIG+/Pxz7h8YYG1goL5h0QDCYMAzAP7gNz8gfnQ4TOGWFqL+AWYAjBjGz4yzbB08eLAhHkT/AOAwgK+bSsEjjzzCu3bv5r6+PsFZHgjQbDYr+B4C8JNJiA3DYVNq5uFoNKr07dtXm4JmpUDNIPgWgHNNpeDxxxnAXQC+LuXIi4l59sEH+dpdu7i3r1fwKq0WaLGo1GKbEegAsLSpFJw+vRpuLnwM4IumSTz/4IMHD7Lf3a2KGSpkBUmKlBVBqzBjGXb9gJgGrPAq3YfDL6F52xHcCUfHOKq77Oxs1dxQogYNm15BcBxVoCAp1OYs6i8Zqj9Cp2n8DyAL5qqCj788EN+8MEHeXBwUJhSWMmk7FKSWflFpFWxRqcnJqSCpd8FBvjJBLO8oX4E8FdTKXjiiSd4586dMsaFaROJhKy+rlxclMgYSKUAy5I3E5k2MzwdDFJvX9+KLa5YAbhcJNcD+K3xFXjmGT516BBv2ryZe3p6KiuglcoLAP4EoNoFdDpIxoiI9gwOFimwLE8mwZcAXGiYB2eeekqo3bFjh+Cs1Mpo5R8C+BPAB/WmgEiUuD/GBfCeNiKMBuKJRCPj2ksHB/vLFCyrgFbZMMwCAL81vAJPPvssr7vhBu7u7q5QuFJwxHXxFMB3AH6oRQGBSRwBEGu0OXD4MOuJU86ePUvz84tSrSHD2GsYxqOGYRwAcJKZfw6HwyWJXJFa+BoAfwL4I5gq2NfXx6Ojo4J3vpBtMjbRKODnR0YGmkoBbRkKnwTwo01Rwb59+1hQsHXrVkFZLleQjFqiUCyWy8o6OjlJuVxO5kqWFWoA+A7ATw2vwKOPPsqbt2zh7u5uiUCpVLaZOW0YzjgR/QTQY/F4vNK1lOLY2BiXSmVGwcIBvwH4peEV2L9/Pw8NDUl6jY2NC/S5fGFDIBDYalr2JgB9jDxO4AwAJReLJYc5n89jYWGhmCsUtbhx3gfwZ8MpuO+++3ht11ru7u6hfL4g4q6rVT2ey+X3EuEeItoCcJhIZ0Fk+UgkQoViUc7OzCzQwsIiLywsAIBK0b8AvGi4Ovbbb79l+eQ33ngjd3V1STfz+bycLxaLS5ZlzzPzGBGdArAA0F8Azlwu4oqtU/dRv6RzYnp6mubn54UdKb1iWfZ5AG83PIf33HMP9/T0iLWi8m0VnXI0Gp1dXFy6HaB7GXkzQGeJ8IthGOcB/A3g14bncN++fYI7VcqZ2YnFYs7CwmKiWCwNlkqlb4ngAugCAPUvG62HNv4FR/38duvPWfUAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);
  tray.setToolTip('Jarvis — BCAutomations');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Jarvis', click: () => mainWindow?.show() },
    { label: 'Toggle Always on Top', click: () => {
      const current = mainWindow?.isAlwaysOnTop();
      mainWindow?.setAlwaysOnTop(!current);
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', () => mainWindow?.show());
}

// ── IPC Handlers ──────────────────────────────────────────────

ipcMain.handle('open-app', async (_, appName) => {
  const key = appName.toLowerCase().trim();
  const entry = APP_ALIASES[key];

  if (entry?.url) {
    await shell.openExternal(entry.url);
    return { opened: true, type: 'url', target: entry.url };
  }

  if (entry) {
    const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux';
    const name = entry[platform];
    if (name) {
      return new Promise((resolve) => {
        const cmd = platform === 'mac' ? `open -a "${name}"` :
                    platform === 'win' ? `start ${name}` : name;
        exec(cmd, (err) => {
          resolve(err ? { opened: false, error: err.message } : { opened: true, type: 'app', target: name });
        });
      });
    }
  }

  // Try as URL if it looks like one
  const urlMatch = key.match(/https?:\/\/[^\s]+/) || key.match(/([a-z0-9-]+\.[a-z]{2,})/);
  if (urlMatch) {
    const url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    await shell.openExternal(url);
    return { opened: true, type: 'url', target: url };
  }

  return { opened: false, error: `Unknown app: ${appName}` };
});

ipcMain.handle('open-url', async (_, url) => {
  await shell.openExternal(url);
  return { opened: true, url };
});

ipcMain.handle('read-file', async (_, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('list-files', async (_, dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.map(e => ({ name: e.name, isDir: e.isDirectory() }));
});

ipcMain.handle('file-exists', async (_, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('write-file', async (_, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return { written: true };
});

ipcMain.handle('set-always-on-top', async (_, value) => {
  mainWindow?.setAlwaysOnTop(value);
  return { alwaysOnTop: value };
});

ipcMain.handle('set-window-size', async (_, width, height) => {
  mainWindow?.setSize(width, height);
  return { width, height };
});

ipcMain.handle('minimize-to-orb', async () => {
  mainWindow?.setSize(120, 120);
  mainWindow?.setResizable(false);
  return { minimized: true };
});

ipcMain.handle('expand-from-orb', async () => {
  mainWindow?.setSize(420, 700);
  mainWindow?.setResizable(true);
  return { expanded: true };
});

// ── App lifecycle ─────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Global hotkey: Ctrl+Shift+J to toggle Jarvis
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
