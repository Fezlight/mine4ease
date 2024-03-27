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
    super($eventEmitter, logger, () => `Uninstalling mod ${mod.name}...`);
    this._mod = Object.assign(new Mod(), mod);
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    let modsSettings = await $modService.getInstanceMods(this._instance.id);

    let dependencies: Mod[] = [];
    modsSettings.mods.forEach((mod: Mod, modId: string) => {
      let isDependencies = mod.dependencies?.filter(dep => dep.id === this._mod.id && dep.relationType === 3).length > 0
      if (isDependencies) {
        dependencies.push(mod);
      }
    });

    dependencies.forEach(dep => {
      this._taskRunner.addTask(new UninstallModTask(dep, this._instance));
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

    await this._taskRunner.process();

    // Refresh list in case mods have been deleted by last process
    modsSettings = await $modService.getInstanceMods(this._instance.id);

    modsSettings.mods.delete(String(this._mod.id));

    await $modService.saveAllMods(modsSettings, this._instance.id);
  }
}
