import {DELETE_MOD_EVENT_NAME, InstanceSettings, Mod, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {$modService} from "../services/ModService";
import {EventEmitter} from "events";
import path from "node:path";

export class UninstallModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _taskRunner: TaskRunner;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _ignoreDependencies: boolean;

  constructor(mod: Mod, instance: InstanceSettings, eventEmitter: EventEmitter = $eventEmitter,
              ignoreDependencies: boolean = false) {
    super(eventEmitter, logger, () => `Uninstalling mod ${mod._name}...`);
    this._mod = Object.assign(new Mod(), mod);
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
    this._ignoreDependencies = ignoreDependencies;
  }

  async run(): Promise<Mod> {
    let modsSettings = await $modService.getInstanceMods(this._instance.id);

    let currentMod =  modsSettings.mods.get(String(this._mod.id));
    if (!currentMod) {
      logger.warn(`Mod ${this._mod.id} already uninstalled from instance ${this._instance.id}`);
      return this._mod;
    }

    logger.info(`Deleting mod ${this._mod.name} to instance ${this._instance.id}`);
    await $utils.deleteFile(path.join(this._mod.fullPath(), this._mod.fileName()))
    .catch((error: Error) => {
      if (error.name === 'FILE_NOT_FOUND') {
        logger.warn(`No mod file found for ${this._mod.fileName()}, assuming it was deleted manually`);
        return;
      }

      throw error;
    });

    if (!this._ignoreDependencies) {
      let dependencyCanBeDeleted: Mod[] = [];
      for (const mod of currentMod.dependencies.filter(m => m.relationType === 3)) {
        let dependencyRemaining = isModHaveDependency(mod, [...modsSettings.mods.values()]
        .filter(m => m.id !== this._mod.id)
        .flatMap(m => m.dependencies));
        let dependentMod =  modsSettings.mods.get(String(mod.id));

        if (!dependencyRemaining && dependentMod && dependentMod.categories.find(cat => cat.id === 421)) {
          dependencyCanBeDeleted.push(dependentMod);
        }
      }

      dependencyCanBeDeleted.forEach(dep => {
        this._taskRunner.addTask(new UninstallModTask(dep, this._instance));
      });
    }

    await this._taskRunner.process();

    this._eventEmitter.emit(DELETE_MOD_EVENT_NAME, currentMod, this._instance);

    return currentMod;
  }
}

export function isModHaveDependency(modToCheck: Mod, modList: Mod[]) : boolean {
  return modList?.filter(dep => dep.id === modToCheck.id && dep.relationType === 3).length > 0;
}

export async function getCurrentMod(instanceId: string, modId: number): Promise<Mod | undefined> {
  let modsSettings = await $modService.getInstanceMods(instanceId);

  return modsSettings.mods.get(String(modId));
}
