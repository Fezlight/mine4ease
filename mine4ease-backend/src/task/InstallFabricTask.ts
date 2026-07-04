import {
  InstallSide,
  Task,
  TaskRunner,
  Version,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {join} from "path";
import {DownloadLibrariesTask} from "./DownloadLibsTask";
import {EventEmitter} from "events";

// Fabric meta endpoint returning a ready-to-use (vanilla launcher compatible)
// version profile json. `%s` are the Minecraft version and the loader version.
const FABRIC_PROFILE_URL = "https://meta.fabricmc.net/v2/versions/loader";

export class InstallFabricTask extends Task {
  private readonly _taskRunner: TaskRunner;
  private readonly _minecraftVersion: string;
  private readonly _loaderVersion: string;
  private readonly _installSide: InstallSide;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _versionName: string;
  private readonly _versionJsonName: string;

  constructor(minecraftVersion: string, fabric: Version, installSide: InstallSide) {
    super($eventEmitter, logger, () => `Installing Fabric ${fabric.name}...`);
    this._minecraftVersion = minecraftVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
    this._loaderVersion = fabric.name
        .replace('fabric-', '')
        .replace(`-${this._minecraftVersion}`, '');
    this._installSide = installSide;
    // Name of the version profile folder / json handled by the launcher.
    this._versionName = `${this._minecraftVersion}-fabric-${this._loaderVersion}`;
    this._versionJsonName = `${this._versionName}.json`;
  }

  async run(): Promise<void> {
    let fabricVersionPath = join(VERSIONS_PATH, this._versionName);
    let alreadyInstalled = await $utils.isFileExist(join(fabricVersionPath, '.installed'));

    let versionJson: any;
    if (!alreadyInstalled) {
      // Download the version profile json directly from the Fabric meta API
      // instead of running the installer jar.
      versionJson = await this.downloadProfile(fabricVersionPath);

      this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
        this._installSide, true, this._subEventEmitter));
    } else {
      versionJson = await $utils.readFile(join(fabricVersionPath, this._versionJsonName))
      .then(JSON.parse);

      this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
        this._installSide, true, this._subEventEmitter, true));
    }

    await this._taskRunner.process();

    const fs = require('node:fs');
    fs.writeFile(join(process.env.APP_DIRECTORY, fabricVersionPath, '.installed'), '', (err: NodeJS.ErrnoException) => {
      if (err) throw Error('Error when writing validation file \'.installed\'');
    });
  }

  async downloadProfile(fabricVersionPath: string): Promise<any> {
    let url = `${FABRIC_PROFILE_URL}/${this._minecraftVersion}/${this._loaderVersion}/profile/json`;

    const profile = await fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`Unable to fetch Fabric profile (${response.status}) from ${url}`);
      }
      return response.json();
    });

    await $utils.saveFile({
      data: JSON.stringify(profile, null, 2),
      path: fabricVersionPath,
      filename: this._versionJsonName
    });

    return profile;
  }
}
