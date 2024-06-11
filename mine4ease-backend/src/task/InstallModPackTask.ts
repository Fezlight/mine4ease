import {
  ApiType,
  CACHE_PATH,
  CURSE_FORGE_TEMPLATE_FILE_DOWNLOAD_URL,
  DownloadRequest,
  ExtractRequest,
  getByType,
  INSTANCE_PATH,
  InstanceSettings,
  Mod,
  ModLoader,
  ModPack,
  Task,
  TaskRunner,
  Version
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {EventEmitter} from "events";
import {join} from "path";
import {v4 as uuidv4} from "uuid";
import {$instanceService} from "../services/InstanceService.ts";
import {InstallModTask} from "./InstallModTask.ts";
import {ExtractFileTask} from "./FileTask.ts";

export class InstallModPackTask extends Task {
  private readonly _apiType: ApiType;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _modpackId: number;
  private readonly _gameVersion: string;

  constructor(modpackId: number, apiType: ApiType, gameVersion: string) {
    super($eventEmitter, logger, () => `Installing modpack '${modpackId}'...`);
    this._apiType = apiType;
    this._modpackId = modpackId;
    this._gameVersion = gameVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    if (this._apiType === ApiType.CURSE) {
      this._taskRunner.addTask(new InstallModPackCurseTask(this._modpackId, this._gameVersion));
    } else {
      throw new Error("Not Implemented");
    }

    await this._taskRunner.process();
  }
}

export class InstallModPackCurseTask extends Task {
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _modpackId: number;
  private readonly _gameVersion: string;
  private readonly _apiType = ApiType.CURSE;
  private _instance: InstanceSettings = new InstanceSettings();

  constructor(modpackId: number, gameVersion: string) {
    super($eventEmitter, logger, () => `Installing Curse modpack '${modpackId}'...`);
    this._modpackId = modpackId;
    this._gameVersion = gameVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    let modpack = await getByType(this._apiType)
    .getItemById(this._modpackId, new ModPack(), this._gameVersion, undefined);
    let modPackFile = await getByType(this._apiType)
    .getFileById(undefined, this._modpackId, new ModPack(), this._gameVersion, modpack.modLoader);

    let file = modPackFile[0];
    file.url = file._url;
    if (!file._url) {
      file._url = CURSE_FORGE_TEMPLATE_FILE_DOWNLOAD_URL
      .replace('<file-id-first4>', String(file.installedFileId).substring(0, 4))
      .replace('<file-id-last3>', String(file.installedFileId).substring(4))
      .replace('<fileName>', encodeURIComponent(file.filename));
    }

    let downloadReq = new DownloadRequest();
    downloadReq.file = file;

    await $downloadService.download(downloadReq);

    let extractReq = new ExtractRequest();
    extractReq.file = file;
    extractReq.includes = [
      "manifest.json"
    ]
    extractReq.destPath = CACHE_PATH;

    await $utils.extractFile(extractReq);

    let manifest = await $utils.readFile(join(extractReq.destPath, "manifest.json"))
    .then(JSON.parse);

    let modLoader: ModLoader | undefined;
    let modloaderId: string | undefined;
    for (let m of manifest.minecraft.modLoaders) {
      modLoader = this.findModloaderByString(m.id);
      modloaderId = m.id;
      if (modLoader) break;
    }

    if (!modLoader || !modloaderId) throw new Error("Unable to find modloader from manifest");

    let minecraftVersion = await this.getMinecraftVersion(manifest.minecraft.version);

    if (!minecraftVersion) throw new Error("Unable to find minecraft version from manifest");

    let modLoaderVersion = await this.getModLoaderVersion(modLoader, minecraftVersion.name, modloaderId);

    this._instance.id = uuidv4();
    this._instance.title = modpack.displayName;
    this._instance.installSide = "client";
    this._instance.modLoader = modLoader;
    this._instance.iconName = modpack.iconUrl;
    this._instance.versions = modLoaderVersion;
    this._instance.versions.minecraft = minecraftVersion;
    this._instance.versions.self = manifest.version;
    this._instance = await $instanceService.createInstance(this._instance);

    for (const file of manifest.files) {
      if (file.required) {
        let mod = new Mod();
        mod.apiType = this._apiType;
        mod.id = file.projectID;
        this._taskRunner.addTask(new InstallModTask(mod, this._instance, this._subEventEmitter, file.fileID, true, false));
      }
    }

    extractReq.includes = [
      "overrides"
    ]
    extractReq.destNameFilter = "overrides/"
    extractReq.destPath = join(INSTANCE_PATH, this._instance.id);

    this._taskRunner.addTask(new ExtractFileTask(extractReq));

    await this._taskRunner.process();
  }

  private findModloaderByString(modloaderId: string): ModLoader | undefined {
    let modloader: ModLoader | undefined;
    if (modloaderId.includes('forge-')) {
      modloader = ModLoader.FORGE;
    }
    return modloader;
  }

  private async getMinecraftVersion(minecraftVersion: string): Promise<Version | undefined> {
    return this.getVersion(getByType(this._apiType).searchVersions(), minecraftVersion);
  }

  private async getModLoaderVersion(modloader: ModLoader, minecraftVersion: string, modloaderId: string): Promise<any> {
    let version = await this.getVersion(getByType(this._apiType).searchVersions(minecraftVersion, modloader), modloaderId);

    if (!version) throw new Error("Unable to find version from manifest");

    if (modloader === ModLoader.FORGE) {
      return {
        forge: version
      };
    } else if (modloader === ModLoader.FABRIC) {
      return {
        fabric: version
      };
    } else if (modloader === ModLoader.QUILT) {
      return {
        quilt: version
      }
    }

    throw new Error("Not yet implemented");
  }

  private async getVersion(promise: Promise<Version[]>, versionName: string): Promise<Version | undefined> {
    let versionList = await promise;

    let result: Version | undefined;
    for (let version of versionList) {
      if (version.name === versionName) {
        result = version;
        break;
      }
    }

    return result;
  }
}