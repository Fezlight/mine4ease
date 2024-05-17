import {
  ADD_TASK_EVENT_NAME,
  DownloadRequest,
  DownloadService,
  IMinecraftService,
  InstanceSettings,
  TaskRunner,
  Utils,
  Version,
  Versions,
  VERSIONS_PATH,
} from "mine4ease-ipc-api";
import {Logger} from "winston";
import path from "node:path";
import {DownloadFileTask} from "../task/FileTask";
import {DownloadAssetsTask} from "../task/DownloadAssetsTask";
import {DownloadLibrariesTask} from "../task/DownloadLibsTask";
import {DownloadJavaTask} from "../task/DownloadJavaTask";
import {InstallForgeTask} from "../task/InstallForgeTask";
import {EventEmitter} from "events";
import {LaunchGameTask} from "../task/LaunchGameTask.ts";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {DownloadModsTask} from "../task/DownloadModsTask.ts";
import {DownloadLoggerTask} from "../task/DownloadLoggerTask.ts";

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

  async beforeLaunch(instance: InstanceSettings): Promise<Versions> {
    let minecraftVersion = instance.versions.minecraft.name;
    let taskRunner = new TaskRunner(this.logger, new EventEmitter());

    // Reinit classpath array to avoid overflow
    process.env.CLASSPATH_ARRAY = "";

    // Read & download manifest version file
    const manifestFile: Version = Object.assign(new Version(), instance.versions.minecraft);
    let version: Versions = await this.downloadManifest(manifestFile);

    taskRunner.addTask(new DownloadJavaTask(version.javaVersion?.component));

    if (instance.installSide === 'client') {
      let client = Object.assign(new Version(), version.downloads.client);
      client.name = version.id;

      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      taskRunner.addTask(new DownloadFileTask(downloadReq));
    }

    taskRunner.addTask(new DownloadAssetsTask(version));

    if(instance.modLoader) {
      if (instance.modLoader === 'Forge' && instance.versions.forge) {
        taskRunner.addTask(new InstallForgeTask(minecraftVersion, instance.versions.forge, instance.installSide));
      }

      taskRunner.addTask(new DownloadModsTask(instance));
    }

    taskRunner.addTask(new DownloadLibrariesTask(version.libraries, minecraftVersion, instance.installSide, true));

    taskRunner.addTask(new DownloadLoggerTask(version));

    await taskRunner.process();

    let versions = [version];
    // TODO Rework Accumulate args / main class of different manifest
    if (instance.modLoader === 'Forge' && instance.versions.forge) {
      let versionName = `${instance.versions.minecraft.name}-${instance.versions.forge.name}`
      const versionJson = await $utils.readFile(path.join(VERSIONS_PATH, versionName, versionName + '.json'))
      .then(JSON.parse);

      versions.push(versionJson);
    }

    let newVersionManifest = version;
    versions.forEach(v => {
      if (version === v) return;

      newVersionManifest.mainClass = v.mainClass;
      if (v.minecraftArguments) {
        if (!newVersionManifest.minecraftArguments) {
          newVersionManifest.minecraftArguments = '';
        }
        // TODO Check duplicate arguments when merging
        // TODO newVersionManifest.minecraftArguments += version.minecraftArguments ?? '';
        newVersionManifest.minecraftArguments = v.minecraftArguments ?? '';
      } else {
        if(v.arguments.jvm) newVersionManifest.arguments.jvm.push(...v.arguments.jvm);
        if(v.arguments.game) newVersionManifest.arguments.game.push(...v.arguments.game);
      }
    });

    return Promise.resolve(newVersionManifest);
  }

  async launchGame(instance: InstanceSettings): Promise<void> {
    const versionManifest = await this.beforeLaunch(instance);

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new LaunchGameTask(instance, versionManifest));
  }
}

export const $minecraftService = new MinecraftService($downloadService, $utils, logger);
