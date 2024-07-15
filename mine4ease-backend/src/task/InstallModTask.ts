import {
  ADD_MOD_EVENT_NAME,
  ApiType,
  CURSE_FORGE_MIRRORS_URL,
  DownloadRequest,
  getByType,
  getCurseForgeFileUrl,
  INSTANCE_PATH,
  InstanceSettings,
  Mod,
  MODS_PATH,
  Task,
  TaskRunner
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {join} from "path";
import {EventEmitter} from "events";
import {$modService} from "../services/ModService";
import {DownloadFileTask} from "./FileTask.ts";

export class InstallModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _ignoreDependencies: boolean;
  private readonly _download: boolean;
  private _version: number | undefined;
  private _alreadyDownloadedMods: number[];

  constructor(mod: Mod, instance: InstanceSettings, eventEmitter: EventEmitter = $eventEmitter, 
              version?: number, ignoreDependencies: boolean = false, download: boolean = true,
              eventCancelled = false, alreadyDownloadedMods: number[] = []) {
    super(eventEmitter, logger, () => `Installing mod ${mod.id}...`, eventCancelled);
    this._mod = mod;
    this._instance = instance;
    this._version = version;
    this._ignoreDependencies = ignoreDependencies;
    this._download = download;
    this._alreadyDownloadedMods = alreadyDownloadedMods;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter, {
      eventCancelled: this._eventEmitter !== $eventEmitter
    });
  }

  async run(): Promise<Mod> {
    let mod: Mod | undefined;

    if (this._mod.filename) {
      let hash= await $utils.readFileHash(join(INSTANCE_PATH, this._instance.id, MODS_PATH, this._mod.filename));

      if (hash === this._mod.sha1) {
        return this._mod;
      }
    }

    if (this._version === undefined) {
      this._version = await this.getModVersionFromManifest(this._mod.id);
    }

    let apiService = getByType(this._mod.apiType);

    if (this._mod.apiType === ApiType.CURSE) {
      let mods = await apiService.getFileById(this._version, this._mod.id, new Mod(), this._instance.versions.minecraft.name, this._instance.modLoader!);
      let modInfo = await apiService.getItemById(this._mod.id, new Mod(), this._instance.versions.minecraft.name, this._instance.modLoader!);

      logger.debug(`getFileById (id: ${this._mod.id}, version: ${this._instance.versions.minecraft.name}, modLoader: ${this._instance.modLoader}): ${JSON.stringify(mods)}`);

      let selectedMod: Mod;
      if (Array.isArray(mods)) {
        selectedMod = mods[0];
      } else {
        selectedMod = mods;
      }

      this._version ??= selectedMod.installedFileId;
      mod = Object.assign(new Mod(), selectedMod);
      if (!mod._url) {
        mod._url = getCurseForgeFileUrl(this._version, selectedMod.filename);
      }

      mod.url = mod._url;
      mod.displayName = modInfo.displayName;
      mod.authors = modInfo.authors;
      mod.summary = modInfo.summary;
      mod.categories = modInfo.categories;
      mod.iconUrl = modInfo.iconUrl;
      mod.downloadCount = modInfo.downloadCount;

      logger.info(`Adding mod ${mod.name} to instance ${this._instance.id}`);
      mod.relativePath = join(INSTANCE_PATH, this._instance.id);

      if (this._download) {
        let downloadRequest = new DownloadRequest();
        downloadRequest.file = mod;
        downloadRequest.mirrors = CURSE_FORGE_MIRRORS_URL;

        await $downloadService.download(downloadRequest);
      }

      if (!this._ignoreDependencies) {
        let downloadedMods = mod.dependencies.map(m => m.id);
        downloadedMods.push(this._mod.id);

        mod.dependencies
        .filter(m => !this._alreadyDownloadedMods.includes(m.id))
        .filter(m => m.relationType == 3)
        .forEach(m => {
          this._taskRunner.addTask(new InstallModTask(m, this._instance, this._subEventEmitter,
            undefined, this._ignoreDependencies, this._download, true, downloadedMods));
        });
      }
    }
    else if (this._mod.apiType === ApiType.FEEDTHEBEAST) {

      if (this._download) {
        let file = Object.assign(new Mod(), this._mod);
        file.relativePath = join(INSTANCE_PATH, this._instance.id);

        let downloadReq = new DownloadRequest();
        downloadReq.file = file;

        this._taskRunner.addTask(new DownloadFileTask(downloadReq, true));
      }

      mod = this._mod;
    }
    else {
      throw new Error("Not yet implemented");
    }

    if (!mod) throw new Error("No mod found to download");

    await this._taskRunner.process();

    this._eventEmitter.emit(ADD_MOD_EVENT_NAME, mod, this._instance);

    return mod;
  }

  async getModVersionFromManifest(modId: number): Promise<number | undefined> {
    return $modService.getMod(modId, this._instance.id)
      .then(mod => mod?.installedFileId);
  }
}
