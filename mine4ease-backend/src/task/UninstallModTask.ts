import {InstanceSettings, Mod, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {$modService} from "../services/ModService.ts";
import {EventEmitter} from "events";
import path from "node:path";

export class UninstallModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _taskRunner: TaskRunner;
  private readonly _subEventEmitter: EventEmitter;

  constructor(mod: Mod, instance: InstanceSettings) {
    super($eventEmitter, logger, () => `Uninstalling mod ${mod._name}...`);
    this._mod = Object.assign(new Mod(), mod);
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    let modsSettings = await $modService.getInstanceMods(this._instance.id);

    let currentMod = modsSettings.mods.get(String(this._mod.id));
    if (!currentMod) {
      logger.info(`Mod ${this._mod.name} already uninstalled from instance ${this._instance.id}`);
      return;
    }

    let modDependent: Mod[] = [];
    modsSettings.mods.forEach((mod: Mod, modId: string) => {
      let isDependent = this.isModHaveDependency(mod, mod.dependencies);
      if (isDependent) {
        modDependent.push(mod);
      }
    });

    let dependencies: Mod[] = [];
    this._mod.dependencies?.forEach(dep => {
      let isOtherModDependency = this.isModHaveDependency(dep, [...modsSettings.mods.values()]);
      if (!isOtherModDependency) {
        dependencies.push(dep);
      }
    });

    logger.info(`Deleting mod ${this._mod.name} to instance ${this._instance.id}`);
    await $utils.deleteFile(path.join(this._mod.fullPath(), this._mod.fileName()))
    .catch((error: Error) => {
      if (error.name === 'FILE_NOT_FOUND') {
        logger.error(`No mod file found for ${this._mod.fileName()}, assuming it was deleted manually`);
        return;
      }

      throw error;
    });

    modsSettings.mods.delete(String(this._mod.id));

    await $modService.saveAllMods(modsSettings, this._instance.id);

    [...modDependent, ...dependencies].forEach(dep => {
      this._taskRunner.addTask(new UninstallModTask(dep, this._instance));
    });

    // Uninstall all dependencies
    await this._taskRunner.process();
  }

  isModHaveDependency(modToCheck: Mod, modList: Mod[]) : boolean {
    return modList?.filter(dep => dep.id === modToCheck.id && dep.relationType === 3).length > 0;
  }
}
