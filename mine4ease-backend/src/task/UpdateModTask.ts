import {InstanceSettings, Mod, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {InstallModTask} from "./InstallModTask.ts";
import {getCurrentMod, isModHaveDependency, UninstallModTask} from "./UninstallModTask";
import {$modService} from "../services/ModService.ts";
import {UPDATE_MOD_EVENT_NAME} from "../../../mine4ease-ipc-api";
import {AddModListeners} from "../listeners/AddModListeners.ts";
import {DeleteModListeners} from "../listeners/DeleteModListeners.ts";

export class UpdateModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;
  private readonly _version: number | undefined;
  private readonly _ignoreDependencies: boolean;

  constructor(mod: Mod, instance: InstanceSettings, eventEmitter = $eventEmitter,
              version?: number, ignoreDependencies: boolean = false) {
    super(eventEmitter, logger, () => `Updating mod ${mod._name}`);
    this._mod = mod;
    this._instance = instance;
    this._version = version;
    this._ignoreDependencies = ignoreDependencies;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, eventEmitter);
  }

  async run(): Promise<void> {
    this._taskRunner.addTask(new UninstallModTask(this._mod, this._instance, this._subEventEmitter,
      this._ignoreDependencies));
    this._taskRunner.addTask(new InstallModTask(this._mod, this._instance, this._subEventEmitter,
      this._version, this._ignoreDependencies));

    let modsSettings = await $modService.getInstanceMods(this._instance.id);

    let currentMod = await getCurrentMod(this._instance.id, this._mod.id);

    if (!this._ignoreDependencies) {
      modsSettings.mods.forEach((mod: Mod) => {
        let isDependent = isModHaveDependency(currentMod!, mod.dependencies);
        if (isDependent) {
          this._taskRunner.addTask(new InstallModTask(mod, this._instance, this._subEventEmitter));
        }
      });
    }

    let addModListener = new AddModListeners(this._subEventEmitter);
    let deleteModListener = new DeleteModListeners(this._subEventEmitter);
    addModListener.start();
    deleteModListener.start();

    await this._taskRunner.process();

    addModListener.stop();
    deleteModListener.stop();
    this._eventEmitter.emit(UPDATE_MOD_EVENT_NAME, currentMod);
  }
}
