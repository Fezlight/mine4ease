import {
  ASSETS_PATH,
  File,
  Instance,
  InstanceService,
  InstanceSettings, MinecraftService,
  Mod,
  ResourcePack,
  Settings,
  Shader, Utils, Version
} from "mine4ease-ipc-api";
import path from "node:path";
import {Logger} from "winston";

export const SETTINGS_FILE = "instances.json";
export const INSTANCE_FILE = "instance.json";
export const INSTANCE_PATH = "instances/";

export class InstanceServiceImpl implements InstanceService {
  static settings: Settings | null = null;

  private minecraftService: MinecraftService;
  private utils: Utils;
  private logger: Logger;

  constructor(minecraftService: MinecraftService, utils: Utils, logger: Logger) {
    this.minecraftService = minecraftService;
    this.utils = utils;
    this.logger = logger;
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
    const settings: Settings = await this.retrieveSettings();

    if(!settings.instances) {
      settings.instances = [];
    }
    settings.instances.push(instance);

    await this.saveInstanceSettings(instance);
    await this.saveSettings(settings);

    return Promise.resolve(instance);
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    this.logger.info("Retrieving instance with id : " + id);
    return this.utils.readFile(INSTANCE_PATH + id + '/' + INSTANCE_FILE)
      .catch((error: Error) => {
        if(error.name === 'FILE_NOT_FOUND') {
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
    this.logger.info("Delete instance with id : " +id);
    return this.utils.deleteFile(INSTANCE_PATH + id)
      .catch((error: Error) => {
        if(error.name === 'FILE_NOT_FOUND') {
          return;
        }
        this.logger.error("", error);
        throw error;
      })
      .then(async () => {
        const settings: Settings = await this.retrieveSettings();
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

        await this.saveSettings(settings);
      });
  }

  async retrieveSettings(): Promise<Settings> {
    this.logger.info("Retrieving launcher settings ...");

    if(InstanceServiceImpl.settings == null) {
      InstanceServiceImpl.settings = await this.utils.readFile(SETTINGS_FILE)
        .then(JSON.parse);

      if(InstanceServiceImpl.settings == null) {
        return Promise.reject(new Error("No launcher settings found"));
      }
    }

    return Promise.resolve(InstanceServiceImpl.settings);
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    this.logger.log("info", `Saving instance ${instanceSettings.id} settings ...`, instanceSettings.id);

    await this.saveIcon(instanceSettings);

    // Save instance without iconPath
    const {iconName, ...instance} = instanceSettings;

    const manifestUrl = instanceSettings.versions.minecraft.url;

    const manifestFile: File = new Version();
    manifestFile.url = manifestUrl;

    await this.minecraftService.downloadManifest!(manifestFile)
      .catch(err => this.logger.error("", err));

    return this.utils.saveFile({
      data: JSON.stringify(instance, null, 2),
      path: INSTANCE_PATH + instance.id,
      filename: "instance.json"
    }).then(() => instanceSettings);
  }

  async saveIcon(instanceSettings: InstanceSettings) {
    let icon = instanceSettings.iconName;
    this.logger.info("Saving instance icon ...")
    if(icon == null || icon === "") {
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

  async saveSettings(settings: Settings): Promise<Settings> {
    this.logger.info("Saving launcher settings ...");
    settings.instances = settings.instances.map(instance => {
      const {id, title, iconName} = instance;
      return {
        id, title, iconName: iconName
      };
    });

    if(InstanceServiceImpl.settings != null) {
      InstanceServiceImpl.settings.instances = settings.instances;
    }

    return this.utils.saveFile({
      data: JSON.stringify(settings, null, 2),
      filename: SETTINGS_FILE
    }).then(() => settings);
  }
}
