import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD_URL = 'https://zamzamfoods.up.railway.app';
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon-512.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Zamzam Foods — Enterprise Distribution Management',
    icon: iconPath,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  const targetUrl = isDev ? DEV_URL : PROD_URL;

  if (isDev) {
    mainWindow.loadURL(targetUrl).catch(() => {
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL(targetUrl);
      }, 1500);
    });
  } else {
    // In production, load the deployed frontend URL with graceful fallback to local dist bundle
    mainWindow.loadURL(targetUrl).catch((err) => {
      console.warn('Could not load remote production URL, loading local bundle:', err);
      if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    });
  }

  // Handle external links safely in the default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('https://wa.me') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:') ||
      !url.includes('zamzamfoods')
    ) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Intercept navigation for external protocols (e.g. WhatsApp, phone links)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (
      url.startsWith('https://wa.me') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:')
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
