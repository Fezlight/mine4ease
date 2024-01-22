import * as winston from "winston";
import {createLogger, format} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import {CacheProvider, CurseApiService, DownloadService, TaskRunner, Utils} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider";
import {MinecraftService} from "../services/MinecraftService.ts";
import {InstanceService} from "../services/InstanceService.ts";
import {AuthService} from "../services/AuthService";
import path from "node:path";
import {app} from "electron";
import {defaultCaches} from "./CacheConfig";
import {GlobalSettingsService} from "../services/GlobalSettingsService";
import {EventEmitter} from 'events';


const {combine, timestamp} = format;

process.env.APP_DIRECTORY = path.join(app.getPath('appData'), '.mine4ease');
process.env.LOG_DIRECTORY = process.env.APP_DIRECTORY + '/logs'

export const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    format.json()
  ),
  transports: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error'}),
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + 'mine4ease.log'})
  ],
  exceptionHandlers: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error'})
  ],
  rejectionHandlers: [
    new DailyRotateFile({filename: process.env.LOG_DIRECTORY + '/' + 'error.log', level: 'error'})
  ],
  handleExceptions: true,
  handleRejections: true
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

// Provider
export const $utils = new Utils(logger);
export const $cacheProvider = new CacheProvider($utils);
export const $authProvider = new AuthProvider($cacheProvider);
export const $eventEmitter = new EventEmitter();
export const $taskRunner = new TaskRunner(logger, $eventEmitter, false);

// Service
export const $downloadService = new DownloadService($utils, logger);
export const $authService = new AuthService($authProvider, $cacheProvider, logger);
export const $apiService = new CurseApiService();
export const $minecraftService = new MinecraftService($downloadService, $apiService, $utils, logger);
export const $globalSettingsService = new GlobalSettingsService(logger, $cacheProvider, $utils);
export const $instanceService = new InstanceService($minecraftService, $globalSettingsService, $utils, logger, $cacheProvider);

// Add default caches
defaultCaches.forEach((v, k) => $cacheProvider.put(k, v));