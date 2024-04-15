import {InstanceSettings, Mod, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {InstallModTask} from "./InstallModTask.ts";
import {UninstallModTask} from "./UninstallModTask.ts";

export class UpdateModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;

  constructor(mod: Mod, instance: InstanceSettings) {
    super($eventEmitter, logger, () => `Updating mod ${mod._name}`);
    this._mod = mod;
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    this._taskRunner.addTask(new UninstallModTask(this._mod, this._instance, this._subEventEmitter));
    this._taskRunner.addTask(new InstallModTask(this._mod, this._instance, this._subEventEmitter));

    await this._taskRunner.process();
  }
}
