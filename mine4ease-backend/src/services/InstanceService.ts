import {
  ADD_TASK_EVENT_NAME,
  ASSETS_PATH,
  CachedFile,
  CacheProvider,
  DownloadRequest,
  IGlobalSettingService,
  IInstanceService,
  IMinecraftService,
  INSTANCE_PATH,
  InstanceSettings,
  ModPack,
  Settings,
  Utils,
  Version
} from "mine4ease-ipc-api";
import path from "node:path";
import {Logger} from "winston";
import {SETTINGS_KEY} from "../config/CacheConfig";
import {$cacheProvider, $downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {$globalSettingsService} from "./GlobalSettingsService.ts";
import {$minecraftService} from "./MinecraftService.ts";
import {InstallModPackTask} from "../task/InstallModPackTask.ts";
import {join} from "path";

export const INSTANCE_FILE = "instance.json";

export class InstanceService implements IInstanceService {
  private minecraftService: IMinecraftService;
  private globalSettingsService: IGlobalSettingService;
  private utils: Utils;
  private logger: Logger;
  private cacheProvider: CacheProvider;

  constructor(minecraftService: IMinecraftService, globalSettingsService: IGlobalSettingService,
              utils: Utils, logger: Logger, cacheProvider: CacheProvider) {
    this.minecraftService = minecraftService;
    this.globalSettingsService = globalSettingsService;
    this.utils = utils;
    this.logger = logger;
    this.cacheProvider = cacheProvider;
  }

  async createInstance(instance: InstanceSettings): Promise<InstanceSettings> {
    const settings: Settings = await this.globalSettingsService.retrieveSettings();

    if (!settings.instances) {
      settings.instances = [];
    }
    settings.instances.push(instance);

    await this.saveInstanceSettings(instance);
    await this.globalSettingsService.saveSettings(settings);

    return Promise.resolve(instance);
  }

  async createInstanceByModPack(modpack: ModPack): Promise<string> {
    let task = new InstallModPackTask(modpack.id, modpack.apiType, modpack.gameVersion);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }

  async selectInstance(id: string): Promise<void> {
    if (this.cacheProvider.has(SETTINGS_KEY)) {
      let settings: Settings = await this.cacheProvider.load(SETTINGS_KEY).then(cache => cache?.object);
      settings.selectedInstance = id;
      await this.cacheProvider.update(SETTINGS_KEY, settings);
    }
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    this.logger.info("Retrieving instance with id : " + id);
    return this.utils.readFile(path.join(INSTANCE_PATH, id, INSTANCE_FILE))
    .catch((error: Error) => {
      if (error.name === 'FILE_NOT_FOUND') {
        let error = new Error("Instance not found");
        error.name = 'INSTANCE_NOT_FOUND';
        throw error;
      }
      this.logger.error("", error);
      throw error;
    })
    .then(JSON.parse);
  }

  async deleteInstance(id: string): Promise<void> {
    this.logger.info("Delete instance with id : " + id);
    return this.utils.deleteFile(path.join(INSTANCE_PATH, id))
    .catch((error: Error) => {
      if (error.name === 'FILE_NOT_FOUND') {
        return;
      }
      this.logger.error("", error);
      throw error;
    })
    .then(async () => {
      const settings: Settings = await this.globalSettingsService.retrieveSettings();
      if (!settings.instances || settings.instances.length == 0) {
        this.logger.error("No instances found");
        return Promise.reject(new Error("No instances found"));
      }
      let instanceFounds = settings.instances.filter(i => i.id === id);
      if (!instanceFounds || instanceFounds.length === 0) {
        this.logger.error("No instances with id " + id + " was found");
        return Promise.reject(new Error("No instances with id " + id + " was found"));
      }
      settings.instances.splice(settings.instances.indexOf(instanceFounds[0]), 1);

      await this.globalSettingsService.saveSettings(settings);
    });
  }

  async openFolder(id: string) {
    this.logger.info("Opening instance folder with id : " + id);
    const shell = require('electron').shell;

    const instancePath = path.join(process.env.APP_DIRECTORY, INSTANCE_PATH, id);
    await shell.openPath(instancePath);
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    this.logger.log("info", `Saving instance ${instanceSettings.id} settings ...`, instanceSettings.id);

    await this.saveIcon(instanceSettings);

    // Save instance without iconPath
    const {iconName, ...instance} = instanceSettings;

    const manifestFile: Version = Object.assign(new Version(), instance.versions.minecraft);
    await this.minecraftService.downloadManifest!(manifestFile);

    return this.utils.saveFile({
      data: JSON.stringify(instance, null, 2),
      path: path.join(INSTANCE_PATH, instance.id),
      filename: "instance.json"
    }).then(() => instanceSettings);
  }

  async saveIcon(instanceSettings: InstanceSettings) {
    let icon = instanceSettings.iconName;
    this.logger.info("Saving instance icon ...")
    if (icon == null || icon === "") {
      this.logger.debug("No icon to save for instance : " + instanceSettings.id);
      return;
    }

    let assetsPath = path.join(INSTANCE_PATH, instanceSettings.id, ASSETS_PATH);
    if (icon.indexOf("http") > -1) {
      let cacheFile = new CachedFile();
      cacheFile.url = icon;

      let downloadReq = new DownloadRequest();
      downloadReq.file = cacheFile;

      await $downloadService.download(downloadReq);

      icon = join(process.env.APP_DIRECTORY, cacheFile.fullPath(), cacheFile.fileName());
    }

    let iconFile = await this.utils.readFile(icon, false, true);
    let filename = "icon" + path.parse(icon).ext;
    instanceSettings.iconName = filename;

    await this.utils.saveFile({
      data: iconFile,
      path: assetsPath,
      filename: filename,
      binary: true
    });
  }
}

export const $instanceService = new InstanceService($minecraftService, $globalSettingsService, $utils, logger, $cacheProvider);
