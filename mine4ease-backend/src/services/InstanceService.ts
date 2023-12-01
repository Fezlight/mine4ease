import {
  ASSETS_PATH,
  CacheProvider,
  IGlobalSettingService,
  IInstanceService,
  IMinecraftService,
  Instance,
  InstanceSettings,
  Mod,
  ResourcePack,
  Settings,
  Shader,
  Utils
} from "mine4ease-ipc-api";
import path from "node:path";
import {Logger} from "winston";
import {SETTINGS_KEY} from "../config/CacheConfig";

export const INSTANCE_FILE = "instance.json";
export const INSTANCE_PATH = "instances/";

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

  addMod(instance: Instance, mod: Mod): Promise<Mod> {
    this.logger.info("Adding mod %s to instance %s", mod, instance.id);
    return Promise.resolve(new Mod());
  }

  addResourcePack(instance: Instance, resourcePack: ResourcePack): Promise<ResourcePack> {
    this.logger.info("Adding resource pack %s to instance %s", resourcePack, instance.id);
    return Promise.resolve(new ResourcePack());
  }

  addShader(instance: Instance, shader: Shader): Promise<Shader> {
    this.logger.info("Adding shader %s to instance %s", shader, instance.id);
    return Promise.resolve(new Shader());
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

  async selectInstance(id: string): Promise<void> {
    if (this.cacheProvider.has(SETTINGS_KEY)) {
      let settings: Settings = await this.cacheProvider.load(SETTINGS_KEY).then(cache => cache?.object);
      settings.selectedInstance = id;
      await this.cacheProvider.update(SETTINGS_KEY, settings);
    }
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    this.logger.info("Retrieving instance with id : " + id);
    return this.utils.readFile(INSTANCE_PATH + id + '/' + INSTANCE_FILE)
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
    return this.utils.deleteFile(INSTANCE_PATH + id)
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

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    this.logger.log("info", `Saving instance ${instanceSettings.id} settings ...`, instanceSettings.id);

    await this.saveIcon(instanceSettings);

    // Save instance without iconPath
    const {iconName, ...instance} = instanceSettings;

    await this.minecraftService.downloadVersionManifest!(instanceSettings);

    return this.utils.saveFile({
      data: JSON.stringify(instance, null, 2),
      path: INSTANCE_PATH + instance.id,
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
