import {
  ADD_TASK_EVENT_NAME,
  DownloadRequest,
  DownloadService,
  IMinecraftService,
  InstanceSettings,
  Utils,
  Version,
  Versions,
} from "mine4ease-ipc-api";
import {Logger} from "winston";
import path from "node:path";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {LaunchInstanceTask} from "../task/LaunchInstanceTask.ts";

export class MinecraftService implements IMinecraftService {
  private readonly downloadService: DownloadService;
  private readonly utils: Utils;
  private readonly logger: Logger;

  constructor(downloadService: DownloadService, utils: Utils, logger: Logger) {
    this.downloadService = downloadService;
    this.utils = utils;
    this.logger = logger;
  }

  async downloadManifest(manifestFile: Version): Promise<Versions> {
    const downloadRequest: DownloadRequest = new DownloadRequest()
    downloadRequest.file = manifestFile;

    this.logger.info(`Retrieving manifest '${downloadRequest.file.fileName()}' ...`);

    const filePathToRead = path.join(downloadRequest.file.fullPath(), downloadRequest.file.fileName());

    return this.downloadService.download(downloadRequest)
    .then(() => this.utils.readFile(filePathToRead))
    .then(JSON.parse);
  }

  async launchGame(instance: InstanceSettings): Promise<string> {
    let task = new LaunchInstanceTask(instance);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }
}

export const $minecraftService = new MinecraftService($downloadService, $utils, logger);
