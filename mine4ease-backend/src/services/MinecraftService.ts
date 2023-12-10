import {
  Account,
  ADD_TASK_EVENT_NAME,
  ArgRule,
  Asset,
  Assets,
  ASSETS_PATH,
  CurseApiService,
  DownloadRequest,
  DownloadService,
  IMinecraftService,
  InstanceSettings,
  Libraries,
  LIBRARIES_PATH,
  Rule,
  Utils,
  Version,
  Versions,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {INSTANCE_PATH} from "./InstanceService";
import {Logger} from "winston";
import {AuthService} from "./AuthService";
import {CachedFile} from "mine4ease-ipc-api/src/models/file/CachedFile";
import exec from "child_process";
import path from "node:path";
import {$eventEmitter} from "../config/ObjectFactoryConfig";
import {DownloadFileTask} from "../task/FileTask.ts";
import {DownloadAssetsTask} from "../task/DownloadAssetsTask.ts";
import {DownloadLibrariesTask} from "../task/DownloadLibsTask.ts";
import {DownloadJavaTask} from "../task/DownloadJavaTask.ts";
import {InstallForgeTask} from "../task/InstallForgeTask.ts";
import {LaunchGameTask} from "../task/LaunchGameTask.ts";

export class MinecraftService implements IMinecraftService {
  private authService: AuthService;
  private downloadService: DownloadService;
  private utils: Utils;
  private logger: Logger;
  private apiService: CurseApiService;

  constructor(authService: AuthService, downloadService: DownloadService, apiService: CurseApiService,
              utils: Utils, logger: Logger) {
    this.authService = authService;
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
      let version = Object.assign(new Version(), instanceSettings.versions.forge);
      let manifest = await this.apiService.searchModLoaderManifest(version.name);
      version.content = new TextEncoder().encode(JSON.stringify(manifest));
      version.name = `${manifestFile.name}-${version.name}`;
      version.extension = ".json";

      versionsManifest.push(this.downloadManifest(version));
    } else if (instanceSettings.versions.fabric) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.fabric)));
    } else if (instanceSettings.versions.quilt) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.quilt)));
    }

    return Promise.all(versionsManifest);
  }

  async downloadManifest(manifestFile: Version | Asset): Promise<Versions | Assets> {
    let downloadRequest: DownloadRequest = new DownloadRequest();
    downloadRequest.file = manifestFile;

    this.logger.info(`Retrieving manifest '${downloadRequest.file.fileName()}' ...`);
    return this.downloadService.download(downloadRequest)
    .then(() => this.utils.readFile(path.join(downloadRequest.file.fullPath(), downloadRequest.file.fileName())))
    .then(JSON.parse);
  }

  // TODO REWORK to be more flexible on the merge of each manifest
  async beforeLaunch(instance: InstanceSettings): Promise<Versions> {
    let minecraftVersion = instance.versions.minecraft.name;

    // Read & download manifest version file
    let versions: Versions[] = await this.downloadVersionManifest(instance)
    .catch(err => this.logger.error("Error when trying to retrieve manifest file", err));
    // TODO Throw a dedicated launch exception

    if (instance.modLoader === 'Forge' && instance.versions.forge) {
      $eventEmitter.emit(ADD_TASK_EVENT_NAME, new InstallForgeTask(minecraftVersion, instance.versions.forge.name));
    }

    if (instance.installSide === 'client') {
      let client = Object.assign(new Version(), versions[0].downloads.client);
      client.name = versions[0].id;

      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadFileTask(downloadReq));
    }

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadAssetsTask(versions[0]));

    const libsToDownloads: Libraries[] = [];
    versions.forEach(version => {
      libsToDownloads.push(...version.libraries);
    })

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadLibrariesTask(libsToDownloads, minecraftVersion, instance.installSide));

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadJavaTask(versions[0].javaVersion.component));

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
