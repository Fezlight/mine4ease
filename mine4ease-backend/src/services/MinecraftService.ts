import {
  ADD_TASK_EVENT_NAME,
  Asset,
  Assets,
  CurseApiService,
  DownloadRequest,
  DownloadService,
  IMinecraftService,
  InstanceSettings,
  Libraries,
  TaskRunner,
  Utils,
  Version,
  Versions,
} from "mine4ease-ipc-api";
import {Logger} from "winston";
import path from "node:path";
import {$eventEmitter} from "../config/ObjectFactoryConfig";
import {DownloadFileTask} from "../task/FileTask";
import {DownloadAssetsTask} from "../task/DownloadAssetsTask";
import {DownloadLibrariesTask} from "../task/DownloadLibsTask";
import {DownloadJavaTask} from "../task/DownloadJavaTask";
import {InstallForgeTask} from "../task/InstallForgeTask";
import {LaunchGameTask} from "../task/LaunchGameTask";
import {EventEmitter} from "events";

export class MinecraftService implements IMinecraftService {
  private readonly downloadService: DownloadService;
  private readonly utils: Utils;
  private readonly logger: Logger;
  private readonly apiService: CurseApiService;

  constructor(downloadService: DownloadService, apiService: CurseApiService, utils: Utils, logger: Logger) {
    this.downloadService = downloadService;
    this.utils = utils;
    this.logger = logger;
    this.apiService = apiService;
  }

  // TODO Rework when forge downloading work
  async downloadVersionManifest(instanceSettings: InstanceSettings): Promise<(Versions | Assets)[]> {
    const manifestFile: Version = Object.assign(new Version(), instanceSettings.versions.minecraft);
    let versionsManifest: Promise<Versions | Assets>[] = [];
    versionsManifest.push(this.downloadManifest(manifestFile));
    if (instanceSettings.versions.forge) {
      let version = await this.createForgeVersionObject(instanceSettings.versions.forge, manifestFile);
      versionsManifest.push(this.downloadManifest(version));
    } else if (instanceSettings.versions.fabric) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.fabric)));
    } else if (instanceSettings.versions.quilt) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.quilt)));
    }
    return Promise.all(versionsManifest);
  }

  private async createForgeVersionObject(forgeVersion: Version, manifestFile: Version): Promise<Version | Asset> {
    let version = Object.assign(new Version(), forgeVersion);
    let manifest = await this.apiService.searchModLoaderManifest(version.name);
    version.content = new TextEncoder().encode(JSON.stringify(manifest));
    version.name = `${manifestFile.name}-${version.name}`;
    version.extension = ".json";
    return version;
  }

  async downloadManifest(manifestFile: Version | Asset): Promise<Versions | Assets> {
    const downloadRequest: DownloadRequest = new DownloadRequest()
    downloadRequest.file = manifestFile;

    this.logger.info(`Retrieving manifest '${downloadRequest.file.fileName()}' ...`);

    const filePathToRead = path.join(downloadRequest.file.fullPath(), downloadRequest.file.fileName());

    return this.downloadService.download(downloadRequest)
    .then(() => this.utils.readFile(filePathToRead))
    .then(JSON.parse);
  }

  // TODO REWORK to be more flexible on the merge of each manifest
  async beforeLaunch(instance: InstanceSettings): Promise<Versions> {
    let minecraftVersion = instance.versions.minecraft.name;
    let taskRunner = new TaskRunner(this.logger, new EventEmitter());

    // Reinit classpath array to avoid overflow
    process.env.CLASSPATH_ARRAY = "";

    // Read & download manifest version file
    let versions: Versions[] = await this.downloadVersionManifest(instance)
    .catch(err => this.logger.error("Error when trying to retrieve manifest file", err));
    // TODO Throw a dedicated launch exception

    taskRunner.addTask(new DownloadJavaTask(versions[0].javaVersion.component));

    if (instance.modLoader === 'Forge' && instance.versions.forge) {
      taskRunner.addTask(new InstallForgeTask(minecraftVersion, instance.versions.forge, instance.installSide));
    }

    if (instance.installSide === 'client') {
      let client = Object.assign(new Version(), versions[0].downloads.client);
      client.name = versions[0].id;

      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      taskRunner.addTask(new DownloadFileTask(downloadReq));
    }

    taskRunner.addTask(new DownloadAssetsTask(versions[0]));

    const libsToDownloads: Libraries[] = [];
    versions.forEach(version => {
      libsToDownloads.push(...version.libraries);
    })

    taskRunner.addTask(new DownloadLibrariesTask(libsToDownloads, minecraftVersion, instance.installSide, true));

    await taskRunner.process();

    // Accumulate args / main class of different manifest
    let newVersionManifest = versions[0];
    versions.forEach(version => {
      if (versions[0] === version) return;

      newVersionManifest.mainClass = version.mainClass;
      if (version.minecraftArguments) {
        if (!newVersionManifest.minecraftArguments) {
          newVersionManifest.minecraftArguments = '';
        }
        newVersionManifest.minecraftArguments += version.minecraftArguments ?? '';
      }
      newVersionManifest.arguments.jvm.push(...version.arguments.jvm);
      newVersionManifest.arguments.game.push(...version.arguments.game);
    })

    return Promise.resolve(newVersionManifest);
  }

  async launchGame(instance: InstanceSettings): Promise<void> {
    const versionManifest = await this.beforeLaunch(instance);

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new LaunchGameTask(instance, versionManifest));
  }
}
