import {INSTANCE_PATH, InstanceSettings, Mod, ModSettings, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {join} from "path";
import {EventEmitter} from "events";
import {InstallModTask} from "./InstallModTask.ts";

export class DownloadModsTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;

  constructor(instance: InstanceSettings) {
    super($eventEmitter, logger, () => "Checking mods ...");
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    let mods: Map<string, Mod> = await $utils.readFile(join(INSTANCE_PATH, this._instance.id, "mods.json"))
    .then(JSON.parse)
    .then((mods: ModSettings) => {
      return new Map(Object.entries(mods.mods));
    })
    .catch((error: Error) => {
      logger.error(error)
      return new Map;
    });

    logger.info(`Checking ${mods.size} mods...`);

    for (const [, mod] of mods) {
      this._taskRunner.addTask(new InstallModTask(mod, this._instance, this._subEventEmitter, mod.installedFileId));
    }

    await this._taskRunner.process();
  }
}
