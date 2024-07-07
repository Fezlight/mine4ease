import {
  ADD_MOD_EVENT_NAME,
  ApiType,
  CurseModPack,
  DELETE_MOD_EVENT_NAME,
  INSTANCE_PATH,
  InstanceSettings,
  Mod,
  Task,
  TaskRunner
} from "mine4ease-ipc-api";
import {$eventEmitter, logger} from "../config/ObjectFactoryConfig.ts";
import {EventEmitter} from "events";
import {downloadModPack, extractAndReadManifest} from "./InstallModPackTask.ts";
import {$modService} from "../services/ModService.ts";
import {UninstallModTask} from "./UninstallModTask.ts";
import {InstallModTask} from "./InstallModTask.ts";
import {join} from "path";
import {ExtractFileTask} from "./FileTask.ts";
import {$instanceService} from "../services/InstanceService.ts";

export class UpdateInstanceTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _taskRunner: TaskRunner;
  private readonly _subEventEmitter: EventEmitter;

  constructor(instance: InstanceSettings, eventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => "Updating instance ...");
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, eventEmitter);
  }

  async run(): Promise<InstanceSettings> {
    if (this._instance.apiType === ApiType.CURSE) {
      this._taskRunner.addTask(new UpdateModPackCurseTask(this._instance, this._subEventEmitter));
    } else {
      throw new Error("Not Implemented");
    }

    await this._taskRunner.process();

    return this._instance;
  }
}

export class UpdateModPackCurseTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;

  constructor(instance: InstanceSettings, eventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => "Updating Curse instance ...");
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, eventEmitter);
  }

  async run(): Promise<any> {
    if (!this._instance.modPack) {
      throw new Error("ModPack information is missing");
    }

    if (!this._instance.modLoader) {
      throw new Error("Cannot update a non-modded instance");
    }

    let file = await downloadModPack(this._instance.modPack.id, this._instance.versions.minecraft.name, this._instance.modLoader);

    let { extractReq, manifest } = await extractAndReadManifest(file);

    let mods = await $modService.getInstanceMods(this._instance.id);

    let modToInstall: any[] = [];
    let allMods: any[] = [];
    for (const file of manifest.files) {
      let mod = mods.mods.get(file.projectID);
      allMods.push(file.projectID);

      if (!mod || file.fileID !== mod?.installedFileId) {
        modToInstall.push(file);
      }
    }

    for (let mod of mods.mods.values()) {
      if (!allMods.includes(mod.id)) {
        this._taskRunner.addTask(new UninstallModTask(mod, this._instance, this._subEventEmitter));
      }
    }

    for (let file of modToInstall) {
      let mod = new Mod();
      mod.apiType = this._instance.apiType;
      mod.id = file.projectID;
      this._taskRunner.addTask(new InstallModTask(mod, this._instance, this._subEventEmitter,
        file.fileID, true, false, true));
    }

    this._subEventEmitter.on(ADD_MOD_EVENT_NAME, (mod: Mod) => {
      mods.mods.set(String(mod.id), mod);
    });

    this._subEventEmitter.on(DELETE_MOD_EVENT_NAME, (mod: Mod) => {
      mods.mods.delete(String(mod.id));
    });

    extractReq.includes = [
      "overrides"
    ]
    extractReq.destNameFilter = "overrides/"
    extractReq.destPath = join(INSTANCE_PATH, this._instance.id);

    this._taskRunner.addTask(new ExtractFileTask(extractReq, true));

    await this._taskRunner.process();

    await $modService.saveAllMods(mods, this._instance.id);

    this._instance.versions.self = manifest.version;
    (<CurseModPack>this._instance.modPack).installedFileId = file.installedFileId;
    (<CurseModPack>this._instance.modPack).installedFileDate = file.installedFileDate;
    await $instanceService.saveInstanceSettings(this._instance);
  }
}
