import {DownloadRequest, LogConfig, Task, Versions} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {join} from "path";

export class DownloadLoggerTask extends Task {
  private _versionManifest: Versions;

  constructor(versionManifest: Versions, eventEmitter: EventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => "Downloading logging config ...");
    this._versionManifest = versionManifest;
  }

  async run(): Promise<void> {
    if (!this._versionManifest?.logging?.client) {
      return;
    }

    let logger = this._versionManifest.logging.client;
    let downloadReq = new DownloadRequest();
    downloadReq.file = Object.assign(new LogConfig(), logger.file);

    await $downloadService.download(downloadReq);

    process.env.LOGGER_PATH = join(process.env.APP_DIRECTORY, downloadReq.file.fullPath(), downloadReq.file.fileName());
  }
}
