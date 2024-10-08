import {app, BrowserWindow, dialog, ipcMain, net, protocol, shell} from 'electron'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {existsSync, mkdirSync} from "fs";
import {
  ASSETS_PATH,
  GAME_EXITED_EVENT_NAME,
  GAME_LAUNCHED_EVENT_NAME,
  INSTANCE_PATH,
  TASK_EVENT_NAME,
  TASK_PROCESSING_EVENT_NAME,
  TaskEvent
} from "mine4ease-ipc-api";
import {handlerMap} from "../src/config/HandlerConfig";
import {$cacheProvider, $eventEmitter, logger} from "../src/config/ObjectFactoryConfig";
import electronUpdater, {type AppUpdater} from 'electron-updater';
import 'v8-compile-cache';

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

export let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const indexHtml = join(process.env.DIST, 'index.html')

app.setAppLogsPath(process.env.LOG_DIRECTORY);

export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = logger;
  autoUpdater.autoDownload = true;
  return autoUpdater;
}

function createWindow() {
  win = new BrowserWindow({
    icon: join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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
      nodeIntegrationInWorker: true,
      preload
    },
  })

  win.on('close', (event) => {
    event.preventDefault();
    $cacheProvider.saveAll().then(() => {
      win?.destroy();
      app.quit();
    });
  });

  let directory = process.env.APP_DIRECTORY;
  if (directory && !existsSync(join(directory))) {
    mkdirSync(join(directory));
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(indexHtml)
      .then(() => getAutoUpdater())
      .then(autoUpdater => autoUpdater.checkForUpdatesAndNotify());
  }

  getAutoUpdater().on('update-downloaded', info => {
    dialog.showMessageBox({
      type: 'info',
      message: "An update is available, would you like to restart now ?",
      buttons: ['yes', 'no']
    }).then(async value => {
      if (value.response === 0) {
        getAutoUpdater().quitAndInstall(true, true);
      }
    })
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event) => {
    if(!event.url.includes('localhost')) {
      event.preventDefault();
      shell.openExternal(event.url);
    } else {
      event.preventDefault();
    }
  })
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
  },
  {
    scheme: 'mine4ease-instance',
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

  $eventEmitter.on(TASK_EVENT_NAME, (taskEvent: TaskEvent) => {
    win?.webContents.send(TASK_EVENT_NAME, taskEvent);
  });

  $eventEmitter.on(TASK_PROCESSING_EVENT_NAME, (progress: number) => {
    win?.webContents.send(TASK_PROCESSING_EVENT_NAME, progress);
  });

  $eventEmitter.on(GAME_LAUNCHED_EVENT_NAME, () => {
    win?.minimize();
    win?.webContents.send(GAME_LAUNCHED_EVENT_NAME);
  });

  $eventEmitter.on(GAME_EXITED_EVENT_NAME, () => {
    win?.show();
    win?.webContents.send(GAME_EXITED_EVENT_NAME);
  });

  protocol.handle('mine4ease-icon', (request) => {
    const appDirectory = process.env.APP_DIRECTORY ?? "";
    const instanceAsset = request.url.replace('..', '').slice('mine4ease-icon://'.length);
    const [instanceId, assetsName] = instanceAsset.split('/');

    const url = join(appDirectory, INSTANCE_PATH, instanceId, ASSETS_PATH, assetsName);
    return net.fetch('file://' + url);
  });

  protocol.handle('mine4ease-instance', async (request) => {
    const appDirectory = process.env.APP_DIRECTORY ?? "";
    const instanceAsset = request.url.replace('..', '').slice('mine4ease-instance://'.length);
    const [instanceId, type] = instanceAsset.split('/');

    if (type === 'mods') {
      const url = join(appDirectory, INSTANCE_PATH, instanceId, "mods.json");
      return net.fetch('file://' + url);
    }
    return Promise.resolve(new Response());
  })
  createWindow()
});
