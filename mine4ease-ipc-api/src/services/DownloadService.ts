import {DownloadRequest} from "../models/DownloadRequest";
import {Utils} from "../utils/Utils";
import {File} from "../models/file/File";
import {Logger} from "winston";

export const fetchWithRetry = (url: string, logger: Logger, options = {}, retry = 3) => {
  return fetch(url, options)
  .then(r => {
    if (r.ok) {
      return r;
    }

    if (retry > 0) {
      logger.error(`Fetching url ${url} : ${retry - 1} attempts left`)
      return fetchWithRetry(url, logger, options, retry - 1);
    }

    throw new Error(`Fetching url ${url} with 3 failed attempts`);
  })
}

export interface IDownloadService {
  download(request: DownloadRequest): Promise<string | void>;
}

export class DownloadService implements IDownloadService {
  private utils: Utils;
  private logger: Logger;

  constructor(utils: Utils, logger: Logger) {
    this.utils = utils;
    this.logger = logger;
  }

  async download(request: DownloadRequest): Promise<string | void> {
    if (!request.file) {
      throw new Error("Download Request need a file to achieve");
    }

    let promise: Promise<ArrayBuffer>;
    if (!request.file.content) {
      promise = this.downloadFromUrl(request);
    } else {
      promise = Promise.resolve(request.file.content);
    }

    return promise
    .then(r => {
      return this.utils.saveFile({
        data: r,
        filename: request.file.fileName(),
        path: request.file.fullPath(),
        binary: true
      })
    })
    .catch((err: Error) => {
      if (err.name === 'FILE_DOWNLOAD_NOT_NEEDED' || err.name === 'FILE_ALREADY_DOWNLOADED') {
        this.logger.debug("", err);
        return;
      }
      this.logger.error("", err);
      throw err;
    });
  }

  private async downloadFromUrl(request: DownloadRequest): Promise<ArrayBuffer> {
    return new Promise(async (resolve, reject) => {
      if (!request.isRuleValid()) {
        let error = new Error(`No need to download file rules are not valid : ${request.file.fileName()}`);
        error.name = "FILE_DOWNLOAD_NOT_NEEDED";
        return reject(error);
      }

      request.file.currentHash = await this.initFileHash(request.file);

      if (!request.needDownload()) {
        let error = new Error(`No need to download file, use already downloaded file : ${request.file.fileName()}`);
        error.name = "FILE_ALREADY_DOWNLOADED";
        return reject(error);
      }

      this.logger.info(`Downloading file ${request.file.fileName()} from ${request.file.url} ...`);
      return resolve("");
    })
    .then(() => fetchWithRetry(request.file.url, this.logger))
    .then(r => {
      if (!r.ok) {
        throw new Error(`Error when trying to download file . : ${r.status}`);
      }
      return r.arrayBuffer();
    })
  }

  async initFileHash(file: File): Promise<string> {
    const path = require("node:path");
    let destFile = path.join(file.fullPath(), file.fileName());
    return this.utils.readFileHash(destFile)
    .then(hash => file.currentHash = hash)
    .catch(() => "");
  }
}
