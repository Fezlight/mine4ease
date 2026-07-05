import * as winston from "winston";
import {createLogger, format} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import {CacheProvider, DownloadService, TaskRunner, Utils} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider";
import path from "node:path";
import {app} from "electron";
import {defaultCaches} from "./CacheConfig";
import {EventEmitter} from 'events';
import fs from "node:fs";

const {combine, timestamp} = format;

const oldPath = path.join(app.getPath('appData'), '.mine4ease');

const basePath = process.env.XDG_DATA_HOME ?? app.getPath('userData');
const newPath = path.join(basePath, 'mine4ease');
process.env.APP_DIRECTORY = path.join(newPath);
process.env.LOG_DIRECTORY = app.getPath('logs');

if (fs.existsSync(path.join(oldPath))){
  fs.cpSync(path.join(oldPath), path.join(newPath), { recursive: true });
  fs.rmSync(path.join(oldPath), { recursive: true, force: true });
}

export const logger = createLogger({
  level: app.isPackaged ? 'info' : 'debug',
  format: combine(
    timestamp(),
    format.json()
  ),
  transports: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + '%DATE%.error.log', level: 'error'}),
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + 'mine4ease.%DATE%.log'})
  ],
  exceptionHandlers: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + '%DATE%.error.log', level: 'error'})
  ],
  rejectionHandlers: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + '%DATE%.error.log', level: 'error'})
  ],
  handleExceptions: true,
  handleRejections: true
});

if (!app.isPackaged) {
  logger.add(new winston.transports.Console());
}

// Provider
export const $utils = new Utils(logger);
export const $cacheProvider = new CacheProvider($utils);
export const $authProvider = new AuthProvider($cacheProvider);
export const $eventEmitter = new EventEmitter();
export const $taskRunner = new TaskRunner(logger, $eventEmitter, undefined, {
  autoWipeQueueOnFail: false,
  propagateError: false,
  eventCancelled: true
});

// Service
export const $downloadService = new DownloadService($utils, logger);

// Add default caches
defaultCaches.forEach((v, k) => $cacheProvider.put(k, v));
