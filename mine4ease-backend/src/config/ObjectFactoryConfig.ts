import {createLogger, format} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import * as winston from "winston";
import {CacheProvider, DownloadService, Utils} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider.ts";
import {MinecraftServiceImpl} from "../services/MinecraftServiceImpl.ts";
import {InstanceServiceImpl} from "../services/InstanceServiceImpl.ts";
import {AuthService} from "../services/AuthService.ts";
import path from "node:path";
import {app} from "electron";

const { combine, timestamp } = format;

process.env.APP_DIRECTORY = path.join(app.getPath('appData'), '.mine4ease');
process.env.LOG_DIRECTORY = process.env.APP_DIRECTORY + '/logs'

const logger = createLogger({
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

// Provider
export const $utils = new Utils(logger);
export const $cacheProvider = new CacheProvider($utils);
export const $authProvider = new AuthProvider();

// Service
export const $downloadService = new DownloadService($utils, logger);
export const $authService = new AuthService($authProvider, $cacheProvider);
export const $minecraftService = new MinecraftServiceImpl($authService, $downloadService, $utils, logger);
export const $instanceService = new InstanceServiceImpl($minecraftService, $utils, logger);
