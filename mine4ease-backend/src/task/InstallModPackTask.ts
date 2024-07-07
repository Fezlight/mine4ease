import {
  ApiType,
  CACHE_PATH,
  CurseModPack,
  DownloadRequest,
  ExtractRequest,
  getByType,
  getCurseForgeFileUrl,
  INSTANCE_PATH,
  InstanceSettings,
  Mod,
  ModLoader,
  ModPack,
  ModSettings,
  Task,
  TASK_EVENT_NAME,
  TaskEvent,
  TaskRunner,
  Version
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {join} from "path";
import {v4 as uuidv4} from "uuid";
import {$instanceService} from "../services/InstanceService";
import {InstallModTask} from "./InstallModTask";
import {DeleteFileTask, DownloadFileTask, ExtractFileTask} from "./FileTask";
import {$modService} from "../services/ModService";
import {CURSE_FORGE_MIRRORS_URL} from "../../../mine4ease-ipc-api";
import {FeedTheBeastModPack} from "../../../mine4ease-ipc-api/src/models/modpack/FeedTheBeastModPack.ts";
import path from "node:path";

export class InstallModPackTask extends Task {
  private readonly _apiType: ApiType;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _modpackId: number;
  private readonly _versionId: number | undefined;
  private readonly _gameVersion: string | undefined;
  private _instance: InstanceSettings;

  constructor(modpackId: number, apiType: ApiType, gameVersion?: string, versionId?: number) {
    super($eventEmitter, logger, () => `Installing modpack '${modpackId}'...`);
    this._apiType = apiType;
    this._modpackId = modpackId;
    this._gameVersion = gameVersion;
    this._versionId = versionId;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
    this._subEventEmitter.on(TASK_EVENT_NAME, (event: TaskEvent) => {
      if (event.object) {
        this._instance = event.object;
      }
    })
  }

  async run(): Promise<InstanceSettings> {
    if (this._apiType === ApiType.CURSE && this._gameVersion) {
      this._taskRunner.addTask(new InstallModPackCurseTask(this._modpackId, this._gameVersion, this._subEventEmitter));
    }
    else if (this._apiType === ApiType.FEEDTHEBEAST) {
      this._taskRunner.addTask(new InstallModPackFeedTheBeastTask(this._modpackId, this._versionId, this._subEventEmitter));
    }
    else {
      throw new Error("Not Implemented");
    }

    await this._taskRunner.process();

    return this._instance;
  }
}

export async function downloadModPack(modPackId: number, gameVersion: string, modLoader: ModLoader) {
  let modPackFile = await getByType(ApiType.CURSE)
  .getFileById(undefined, modPackId, new ModPack(), gameVersion, modLoader);

  let file = modPackFile[0];
  file.url = file._url;
  if (!file._url) {
    file._url = getCurseForgeFileUrl(file.installedFileId, file.filename);
  }

  let downloadReq = new DownloadRequest();
  downloadReq.file = file;
  downloadReq.mirrors = CURSE_FORGE_MIRRORS_URL;

  await $downloadService.download(downloadReq);
  return file;
}

export async function extractAndReadManifest(file: ModPack) {
  let extractReq = new ExtractRequest();
  extractReq.file = file;
  extractReq.includes = [
    "manifest.json"
  ]
  extractReq.destPath = CACHE_PATH;

  await $utils.extractFile(extractReq);

  let manifest = await $utils.readFile(join(extractReq.destPath, "manifest.json"))
  .then(JSON.parse);
  return { extractReq, manifest };
}

export class InstallModPackCurseTask extends Task {
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _modpackId: number;
  private readonly _gameVersion: string;
  private readonly _apiType = ApiType.CURSE;
  private _instance: InstanceSettings = new InstanceSettings();

  constructor(modpackId: number, gameVersion: string, eventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => `Installing Curse modpack '${modpackId}'...`);
    this._modpackId = modpackId;
    this._gameVersion = gameVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
  }

  async run(): Promise<InstanceSettings> {
    let modpack = await getByType(this._apiType)
    .getItemById(this._modpackId, new ModPack(), this._gameVersion, undefined);
    let file = await downloadModPack(this._modpackId, this._gameVersion, modpack.modLoader);

    let {extractReq, manifest} = await extractAndReadManifest(file);

    let modLoader: ModLoader | undefined;
    let modloaderId: string | undefined;
    for (let m of manifest.minecraft.modLoaders) {
      modLoader = this.findModloaderByString(m.id);
      modloaderId = m.id;
      if (modLoader) break;
    }

    if (!modLoader || !modloaderId) throw new Error("Unable to find modloader from manifest");

    let minecraftVersion = await getMinecraftVersion(manifest.minecraft.version);

    if (!minecraftVersion) throw new Error("Unable to find minecraft version from manifest");

    let modLoaderVersion = await getModLoaderVersion(modLoader, minecraftVersion.name, modloaderId);

    let curseModPack = new CurseModPack();
    curseModPack.id = modpack.id;
    curseModPack.title = modpack.displayName;
    curseModPack.installedFileId = file.installedFileId;

    this._instance.id = uuidv4();
    this._instance.title = modpack.displayName;
    this._instance.installSide = "client";
    this._instance.modLoader = modLoader;
    this._instance.modPack = curseModPack;
    this._instance.iconName = modpack.iconUrl;
    this._instance.apiType = this._apiType;
    this._instance.versions = modLoaderVersion;
    this._instance.versions.minecraft = minecraftVersion;
    this._instance.versions.self = manifest.version;
    this._instance = await $instanceService.createInstance(this._instance);

    for (const file of manifest.files) {
      if (file.required) {
        let mod = new Mod();
        mod.apiType = this._apiType;
        mod.id = file.projectID;
        this._taskRunner.addTask(new InstallModTask(mod, this._instance,
          this._subEventEmitter, file.fileID, true, false));
      }
    }

    let mods: ModSettings = new ModSettings();
    this._subEventEmitter.on(TASK_EVENT_NAME, (event: TaskEvent) => {
      if (event.state === 'FINISHED' && event.object && event.object instanceof Mod) {
        mods.mods.set(String(event.object.id), event.object);
      }
    });

    await this._taskRunner.process(false);

    await $modService.saveAllMods(mods, this._instance.id);

    extractReq.includes = [
      "overrides"
    ]
    extractReq.destNameFilter = "overrides/"
    extractReq.destPath = join(INSTANCE_PATH, this._instance.id);

    this._taskRunner.addTask(new ExtractFileTask(extractReq));

    this._taskRunner.addTask(new DeleteFileTask(join(file.fullPath(), file.fileName())));

    await this._taskRunner.process();

    return this._instance;
  }

  private findModloaderByString(modloaderId: string): ModLoader | undefined {
    let modloader: ModLoader | undefined;
    if (modloaderId.includes('forge-')) {
      modloader = ModLoader.FORGE;
    }
    return modloader;
  }
}

async function getMinecraftVersion(minecraftVersion: string): Promise<Version | undefined> {
  return getVersion(getByType(ApiType.CURSE).searchVersions(), minecraftVersion);
}

async function getModLoaderVersion(modloader: ModLoader, minecraftVersion: string, modloaderId: string): Promise<any> {
  let version = await getVersion(getByType(ApiType.CURSE).searchVersions(minecraftVersion, modloader), modloaderId);

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

async function getVersion(promise: Promise<Version[]>, versionName: string): Promise<Version | undefined> {
  let versionList = await promise;

  let result: Version | undefined;
  for (let version of versionList) {
    if (version.name.includes(versionName)) {
      result = version;
      break;
    }
  }

  return result;
}

export class InstallModPackFeedTheBeastTask extends Task {
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _modpackId: number;
  private _versionId: number | undefined;
  private readonly _apiType = ApiType.FEEDTHEBEAST;
  private _instance: InstanceSettings = new InstanceSettings();

  constructor(modpackId: number, versionId: number | undefined, eventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => `Installing FeedTheBeast modpack '${modpackId}'...`);
    this._modpackId = modpackId;
    this._versionId = versionId;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
  }

  async run(): Promise<any> {
    let modpack = await getByType(this._apiType)
    .getFileById(undefined, this._modpackId, new ModPack(), "", undefined);

    let selectedModPack: ModPack;
    if (Array.isArray(modpack)) {
      selectedModPack = modpack.sort(this.sortModPack)[0];
      this._versionId = Number(selectedModPack.version.id);
    } else {
      throw new Error("Unable to retrieve modpack");
    }

    let modLoader = selectedModPack.modLoader;
    let modloaderId = selectedModPack.modLoaderId;

    if (!modLoader || !modloaderId) throw new Error("Unable to find modloader from modpack");

    let minecraftVersion = await getMinecraftVersion(selectedModPack.gameVersion!);

    if (!minecraftVersion) throw new Error("Unable to find minecraft version from modpack");

    let modLoaderVersion = await getModLoaderVersion(modLoader, minecraftVersion.name, modloaderId);

    let feedTheBeastModPack = new FeedTheBeastModPack();
    feedTheBeastModPack.title = selectedModPack.displayName;
    feedTheBeastModPack.id = selectedModPack.id;

    this._instance.id = uuidv4();
    this._instance.title = selectedModPack.displayName;
    this._instance.installSide = "client";
    this._instance.modLoader = selectedModPack.modLoader;
    this._instance.modPack = feedTheBeastModPack;
    this._instance.iconName = selectedModPack.iconUrl;
    this._instance.apiType = this._apiType;
    this._instance.versions = modLoaderVersion;
    this._instance.versions.minecraft = minecraftVersion;
    this._instance.versions.self = selectedModPack.version.name;
    this._instance = await $instanceService.createInstance(this._instance);

    let modpackFiles = await getByType(this._apiType)
    .getFileById(this._versionId, this._modpackId, new ModPack(), "", undefined);

    if (Array.isArray(modpackFiles)) {
      throw new Error("Unable to find modpack files");
    }

    for (const file of modpackFiles.files) {
      if (file instanceof Mod) {
        this._taskRunner.addTask(new InstallModTask(file, this._instance, this._subEventEmitter,
          file.installedFileId, true, false));
      } else {
        file.relativePath = path.join(INSTANCE_PATH, this._instance.id);

        let downloadReq = new DownloadRequest();
        downloadReq.file = file;

        this._taskRunner.addTask(new DownloadFileTask(downloadReq));
      }
    }

    let mods: ModSettings = new ModSettings();
    this._subEventEmitter.on(TASK_EVENT_NAME, (event: TaskEvent) => {
      if (event.state === 'FINISHED' && event.object && event.object instanceof Mod) {
        mods.mods.set(String(event.object.id), event.object);
      }
    });

    await this._taskRunner.process(false);

    await $modService.saveAllMods(mods, this._instance.id);

    return this._instance;
  }

  sortModPack(a: ModPack, b: ModPack) {
    let v1 = Number(a.version.id);
    let v2 = Number(b.version.id);

    return v2 - v1;
  }

}
