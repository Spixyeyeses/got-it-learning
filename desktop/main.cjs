'use strict';
const { app, BrowserWindow, dialog, Menu, session } = require('electron');
const path = require('node:path');
const { startServer } = require('../tools/static-server.cjs');

// Keep the same data location across development, portable and installed builds.
app.setPath('userData', process.env.GOT_IT_TEST_PROFILE || path.join(app.getPath('appData'), 'GotItLearning'));
app.setAppUserModelId('org.gotitlearning.desktop');
let running, mainWindow;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    // Fixed port is intentional: localStorage and IndexedDB are tied to the origin.
    running = await startServer({ root: path.join(app.getAppPath(), 'dist/web'), port: 4174 });
    const trusted = url => { try { return new URL(url).origin === running.url; } catch { return false; } };
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission === 'fullscreen' && trusted(contents.getURL())));
    session.defaultSession.setPermissionCheckHandler((contents, permission, origin) => permission === 'fullscreen' && trusted(origin));
    mainWindow = new BrowserWindow({
      width: 1280, height: 900, minWidth: 760, minHeight: 600, show: false,
      title: '学会啦 · Got It Learning', icon: path.join(app.getAppPath(), 'dist/web/assets/nameless-academy-logo.png'),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false, backgroundThrottling: true }
    });
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '学会啦', submenu: [{ label: '退出 / Exit', role: 'quit' }] },
      { label: '编辑 / Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '视图 / View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
    ]));
    mainWindow.once('ready-to-show', () => mainWindow.show());
    await mainWindow.loadURL(running.url);
  }).catch(error => {
    dialog.showErrorBox('学会啦启动失败 / Startup failed', error.code === 'EADDRINUSE' ? 'Port 4174 is already in use. Close the other application and try again. The desktop port stays fixed to preserve your saved progress.' : error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (running) running.server.close(); });
}
