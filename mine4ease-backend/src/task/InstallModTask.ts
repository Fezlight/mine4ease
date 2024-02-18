import {ApiType, DownloadRequest, INSTANCE_PATH, InstanceSettings, Mod, Task, TaskRunner} from "mine4ease-ipc-api";
import {$apiService, $downloadService, $eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {join} from "path";
import {EventEmitter} from "events";

export class InstallModTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _mod: Mod;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;

  constructor(mod: Mod, instance: InstanceSettings) {
    super($eventEmitter, logger, () => `Installing mod ${mod._name}...`);
    this._mod = mod;
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
  }

  async run(): Promise<void> {
    if(this._mod.apiType === ApiType.CURSE) {
      let mods = await $apiService.getFileById(this._mod.id, this._instance.versions.minecraft.name, this._instance.modLoader!);

      let mod = Object.assign(new Mod(), mods[0]);
      mod.url = mod._url;

      logger.info(`Adding mod ${mod.name} to instance ${this._instance.id}`);
      mod.relativePath = join(INSTANCE_PATH, this._instance.id);

      let downloadRequest = new DownloadRequest();
      downloadRequest.file = mod;

      await $downloadService.download(downloadRequest);

      // Install dependencies
      mod.dependencies.filter(mod => mod.relationType == 3).forEach(mod => {
        this._taskRunner.addTask(new InstallModTask(mod, this._instance));
      });
    }

    await this._taskRunner.process();

    // TODO ADD mod to mods.json file
  }
}
