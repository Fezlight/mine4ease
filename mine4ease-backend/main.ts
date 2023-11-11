import {app, BrowserWindow, ipcMain, net, protocol} from 'electron'
import path from 'node:path'
import fs from "node:fs";
import {INSTANCE_PATH} from "./src/services/InstanceServiceImpl";
import {ASSETS_PATH} from "mine4ease-ipc-api";
import {handlerMap} from "./src/config/HandlerConfig.ts";

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

app.setAppLogsPath(process.env.LOG_DIRECTORY);

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 30
    },
    width: 1200,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.on('close', (event) => {
    event.preventDefault();
    win?.webContents.send('saveSettings');
    setTimeout(() => {
      win?.destroy();
      app.quit();
    }, 500);
  });

  let directory = process.env.APP_DIRECTORY;
  if (directory && !fs.existsSync(path.join(directory))) {
    fs.mkdirSync(path.join(directory));
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mine4ease-icon',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

app.whenReady().then(() => {
  handlerMap.forEach((v, k) => {
    ipcMain.handle(k, v);
  })

  protocol.handle('mine4ease-icon', (request) => {
    const appDirectory = process.env.APP_DIRECTORY ?? "";
    const instanceAsset = request.url.replace('..', '').slice('mine4ease-icon://'.length);
    const [instanceId, assetsName] = instanceAsset.split('/');

    const url = path.join(appDirectory, INSTANCE_PATH, instanceId, ASSETS_PATH, assetsName);
    return net.fetch('file://' + url);
  })
  createWindow()
});
