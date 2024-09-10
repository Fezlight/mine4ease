import {DownloadRequest, InstanceSettings, Task, TaskRunner, Version, Versions, VERSIONS_PATH} from "mine4ease-ipc-api";
import {EventEmitter} from "events";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {DownloadJavaTask} from "./DownloadJavaTask.ts";
import {DownloadFileTask} from "./FileTask.ts";
import {DownloadAssetsTask} from "./DownloadAssetsTask.ts";
import {InstallForgeTask} from "./InstallForgeTask.ts";
import {DownloadModsTask} from "./DownloadModsTask.ts";
import {DownloadLibrariesTask} from "./DownloadLibsTask.ts";
import {DownloadLoggerTask} from "./DownloadLoggerTask.ts";
import path from "node:path";
import {$minecraftService} from "../services/MinecraftService.ts";
import {LaunchGameTask} from "./LaunchGameTask.ts";

export class LaunchInstanceTask extends Task {
  private readonly _instance: InstanceSettings;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _taskRunner: TaskRunner;

  constructor(instance: InstanceSettings) {
    super($eventEmitter, logger, () => "Launching Instance ...");
    this._instance = instance;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, $eventEmitter);
  }

  async run(): Promise<any> {
    let minecraftVersion = this._instance.versions.minecraft.name;

    // Reinit classpath array to avoid overflow
    process.env.CLASSPATH_ARRAY = "";

    let version = await this.downloadAndReadManifest();

    this._taskRunner.addTask(new DownloadJavaTask(version.javaVersion?.component));

    if (this._instance.installSide === 'client') {
      let client = Object.assign(new Version(), version.downloads.client);
      client.name = version.id;

      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      this._taskRunner.addTask(new DownloadFileTask(downloadReq));
    }

    this._taskRunner.addTask(new DownloadAssetsTask(version));

    if (this._instance.modLoader) {
      if (this._instance.modLoader === 'Forge' && this._instance.versions.forge) {
        this._taskRunner.addTask(new InstallForgeTask(minecraftVersion, this._instance.versions.forge, this._instance.installSide));
      }

      this._taskRunner.addTask(new DownloadModsTask(this._instance));
    }

    this._taskRunner.addTask(new DownloadLibrariesTask(version.libraries, minecraftVersion, this._instance.installSide, true));

    this._taskRunner.addTask(new DownloadLoggerTask(version));

    this._taskRunner.addTask(new LaunchGameTask(this._instance, () => this.buildFinalManifest(version)));

    await this._taskRunner.process();
  }

  private async downloadAndReadManifest() {
    const manifestFile: Version = Object.assign(new Version(), this._instance.versions.minecraft);
    return  await $minecraftService.downloadManifest(manifestFile);
  }

  private async buildFinalManifest(version: Versions) {
    let versions = [version];

    // TODO Rework Accumulate args / main class of different manifest
    if (this._instance.modLoader === 'Forge' && this._instance.versions.forge) {
      let versionName = `${this._instance.versions.minecraft.name}-${this._instance.versions.forge.name}`
      const versionJson = await $utils.readFile(path.join(VERSIONS_PATH, versionName, versionName + '.json'))
      .then(JSON.parse);

      versions.push(versionJson);
    }

    let newVersionManifest = version;
    versions.forEach(v => {
      if (version === v) return;

      newVersionManifest.mainClass = v.mainClass;
      if (v.minecraftArguments) {
        if (!newVersionManifest.minecraftArguments) {
          newVersionManifest.minecraftArguments = '';
        }
        // TODO Check duplicate arguments when merging
        // TODO newVersionManifest.minecraftArguments += version.minecraftArguments ?? '';
        newVersionManifest.minecraftArguments = v.minecraftArguments ?? '';
      } else {
        if (v.arguments.jvm) newVersionManifest.arguments.jvm.push(...v.arguments.jvm);
        if (v.arguments.game) newVersionManifest.arguments.game.push(...v.arguments.game);
      }
    });

    return newVersionManifest;
  }
}
