const { app, BrowserWindow, Menu, shell, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const APP_URL = 'https://app.dottapps.com';
const isDev = process.argv.includes('--dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Dott',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#ffffff',
  });

  mainWindow.loadURL(isDev ? 'https://staging.dottapps.com' : APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://app.dottapps.com') || url.startsWith('https://staging.dottapps.com')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: 'Dott',
      submenu: [
        { label: 'About Dott', role: 'about' },
        { label: 'Check for Updates...', click: () => checkForUpdatesManual() },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.loadURL(`${isDev ? 'https://staging.dottapps.com' : APP_URL}/Settings`) },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+D', click: () => mainWindow?.loadURL(`${isDev ? 'https://staging.dottapps.com' : APP_URL}/dashboard`) },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => mainWindow?.webContents.goBack() },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => mainWindow?.webContents.goForward() },
        { type: 'separator' },
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => navigateTo('/dashboard') },
        { label: 'Invoices', accelerator: 'CmdOrCtrl+2', click: () => navigateTo('/invoices') },
        { label: 'Inventory', accelerator: 'CmdOrCtrl+3', click: () => navigateTo('/inventory') },
        { label: 'POS', accelerator: 'CmdOrCtrl+4', click: () => navigateTo('/pos') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => navigateTo('/Settings') },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
        ] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Dott Help Center', click: () => shell.openExternal('https://dottapps.com/help') },
        { label: 'Report an Issue', click: () => shell.openExternal('https://dottapps.com/contact') },
        { type: 'separator' },
        { label: `Version ${app.getVersion()}`, enabled: false },
        ...(process.platform !== 'darwin' ? [
          { type: 'separator' },
          { label: 'Check for Updates...', click: () => checkForUpdatesManual() },
        ] : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function navigateTo(path) {
  const base = isDev ? 'https://staging.dottapps.com' : APP_URL;
  mainWindow?.loadURL(`${base}${path}`);
}

// ---- Auto-Update ----

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Dott v${info.version} is available.`,
      detail: 'The update is being downloaded in the background. You will be notified when it is ready to install.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Dott v${info.version} has been downloaded.`,
      detail: 'The update will be installed when you restart the app. Restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err?.message);
  });

  // Check for updates 5 seconds after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000);
}

function checkForUpdatesManual() {
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates',
      message: 'You are running the latest version of Dott.',
      buttons: ['OK'],
    });
  });
}

// ---- App lifecycle ----

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  if (!isDev) {
    setupAutoUpdater();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.setAboutPanelOptions({
  applicationName: 'Dott',
  applicationVersion: app.getVersion(),
  copyright: 'Copyright © 2026 Dott LLC',
  website: 'https://dottapps.com',
});
