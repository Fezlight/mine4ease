import {app, BrowserWindow, ipcMain, net, protocol} from 'electron'
import path from 'node:path'
import fs from "node:fs";
import {INSTANCE_PATH, InstanceServiceImpl} from "./src/services/InstanceServiceImpl";
import {ASSETS_PATH, DownloadService, InstanceService, Utils} from "mine4ease-ipc-api";
import * as winston from "winston";
import {createLogger, format} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import {MinecraftServiceImpl} from "./src/services/MinecraftServiceImpl";
import {AuthService} from "./src/services/AuthService";
import {AuthProvider} from "./src/providers/AuthProvider";

const { combine, timestamp } = format;

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')
process.env.APP_DIRECTORY = path.join(app.getPath('appData'),  '.mine4ease');
process.env.LOG_DIRECTORY = process.env.APP_DIRECTORY + '/logs'

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

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
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
  if(directory && !fs.existsSync(path.join(directory))) {
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

export const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    format.json()
  ),
  transports: [
    new DailyRotateFile({ filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error' }),
    new DailyRotateFile({ filename: process.env.LOG_DIRECTORY + '/' + 'mine4ease.log' })
  ],
  exceptionHandlers: [
    new DailyRotateFile({ filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error' })
  ],
  rejectionHandlers: [
    new DailyRotateFile({ filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error' })
  ],
  handleExceptions: true,
  handleRejections: true
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

export const $instanceService: InstanceService = new InstanceServiceImpl();
export const $utils: Utils = new Utils(logger);
export const $minecraftService: MinecraftServiceImpl = new MinecraftServiceImpl();
export const $downloadService: DownloadService = new DownloadService($utils, logger);
export const $authService: AuthService = new AuthService(new AuthProvider());

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mine4ease-icon',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

app.whenReady().then(() => {
  ipcMain.handle('instanceService.createInstance', (ev, args) => $instanceService.createInstance(JSON.parse(args)));
  ipcMain.handle('instanceService.deleteInstance', (ev, args) => $instanceService.deleteInstance(args))
  ipcMain.handle('instanceService.getInstanceById', (ev, args) => $instanceService.getInstanceById(args));
  ipcMain.handle('instanceService.saveSettings', (ev, args) => $instanceService.saveSettings(JSON.parse(args)));
  ipcMain.handle('instanceService.saveInstanceSettings', (ev, args) => $instanceService.saveInstanceSettings(JSON.parse(args)));
  ipcMain.handle('instanceService.retrieveSettings', () => $instanceService.retrieveSettings());
  ipcMain.handle('minecraftService.launchGame', (ev, args) => $minecraftService.launchGame(JSON.parse(args)));
  ipcMain.handle('authService.authenticate', (ev, args) => $authService.authenticate(args));

  protocol.handle('mine4ease-icon', (request) => {
    const appDirectory = process.env.APP_DIRECTORY ?? "";
    const instanceAsset = request.url.replace('..', '').slice('mine4ease-icon://'.length);
    const [instanceId, assetsName] = instanceAsset.split('/');

    const url = path.join(appDirectory, INSTANCE_PATH, instanceId, ASSETS_PATH, assetsName);
    return net.fetch('file://' + url);
  })
  createWindow()
});
