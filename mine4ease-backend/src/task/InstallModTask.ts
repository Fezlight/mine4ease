import {
  ApiType,
  DownloadRequest,
  getByType,
  INSTANCE_PATH,
  InstanceSettings,
  Mod,
  ModSettings,
  Task,
  TaskRunner
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {join} from "path";
import {EventEmitter} from "events";
import {$modService} from "../services/ModService.ts";

const url = 'https://media.forgecdn.net/files/<file-id-first4>/<file-id-last3>/<fileName>'

export class InstallModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _ignoreDependencies: boolean;
  private _version: number | undefined;

  constructor(mod: Mod, instance: InstanceSettings, eventEmitter: EventEmitter = $eventEmitter, version?: number, ignoreDependencies: boolean = false) {
    super(eventEmitter, logger, () => `Installing mod ${mod._name}...`);
    this._mod = mod;
    this._instance = instance;
    this._version = version;
    this._ignoreDependencies = ignoreDependencies;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    let mod: Mod | undefined;
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
        mod._url = url
        .replace('<file-id-first4>', String(this._version).substring(0, 4))
        .replace('<file-id-last3>', String(this._version).substring(4))
        .replace('<fileName>', selectedMod.filename);
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

      let downloadRequest = new DownloadRequest();
      downloadRequest.file = mod;

      await $downloadService.download(downloadRequest);

      if (!this._ignoreDependencies) {
        mod.dependencies.filter(mod => mod.relationType == 3).forEach(mod => {
          this._taskRunner.addTask(new InstallModTask(mod, this._instance, this._subEventEmitter));
        });
      }
    } else {
      throw new Error("Not yet implemented");
    }

    if (!mod) throw new Error("No mod found to download");

    await this._taskRunner.process();

    let modsJson: ModSettings = await $modService.getInstanceMods(this._instance.id);

    modsJson.mods.set(String(mod.id), mod);

    await $modService.saveAllMods(modsJson, this._instance.id);
  }
}
