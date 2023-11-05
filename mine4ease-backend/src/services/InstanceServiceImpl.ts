import {Instance, InstanceService, InstanceSettings, Mod, ResourcePack, Settings, Shader} from "mine4ease-ipc-api";
import path from "node:path";
import {$utils, logger} from "../../main";

const SETTINGS_FILE = "instances.json";
const INSTANCE_FILE = "instance.json";
const INSTANCE_PATH = "instances/";
const ASSETS_PATH = "assets/";
export class InstanceServiceImpl implements InstanceService {
  static settings: Settings | null = null;

  addMod(instance: Instance, mod: Mod): Promise<Mod> {
    logger.info("Adding mod %s to instance %s", mod, instance.id);
    return Promise.resolve(undefined);
  }

  addResourcePack(instance: Instance, resourcePack: ResourcePack): Promise<ResourcePack> {
    logger.info("Adding resource pack %s to instance %s", resourcePack, instance.id);
    return Promise.resolve(undefined);
  }

  addShader(instance: Instance, shader: Shader): Promise<Shader> {
    logger.info("Adding shader %s to instance %s", shader, instance.id);
    return Promise.resolve(undefined);
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
    logger.info("Retrieving instance with id : " + id);
    return $utils.readFile(INSTANCE_PATH + id + '/' + INSTANCE_FILE)
      .catch((error: Error) => {
        if(error.name === 'FILE_NOT_FOUND') {
          let error = new Error("Instance not found");
          error.name = 'INSTANCE_NOT_FOUND';
          throw error;
        }
        logger.error(error);
        throw error;
      })
      .then(JSON.parse);
  }

  async deleteInstance(id: string): Promise<void> {
    logger.info("Delete instance with id : " +id);
    return $utils.deleteFile(INSTANCE_PATH + id)
      .catch((error: Error) => {
        if(error.name === 'FILE_NOT_FOUND') {
          return;
        }
        logger.error(error.message);
        throw error;
      })
      .then(async () => {
        const settings: Settings = await this.retrieveSettings();
        if (!settings.instances || settings.instances.length == 0) {
          logger.error("No instances found");
          return Promise.reject(new Error("No instances found"));
        }
        let instanceFounds = settings.instances.filter(i => i.id === id);
        if (!instanceFounds || instanceFounds.length === 0) {
          logger.error("No instances with id " + id + " was found");
          return Promise.reject(new Error("No instances with id " + id + " was found"));
        }
        settings.instances.splice(settings.instances.indexOf(instanceFounds[0]), 1);

        await this.saveSettings(settings);
      });
  }

  async retrieveSettings(): Promise<Settings> {
    logger.info("Retrieving launcher settings ...");

    if(InstanceServiceImpl.settings == null) {
      InstanceServiceImpl.settings = await $utils.readFile(SETTINGS_FILE)
        .then(JSON.parse);

      if(InstanceServiceImpl.settings == null) {
        return Promise.reject(new Error("No launcher settings found"));
      }
    }

    return Promise.resolve(InstanceServiceImpl.settings);
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    logger.log("info", "Saving instance %s settings ...", instanceSettings.id);

    await this.saveIcon(instanceSettings);

    // Save instance without iconPath
    const {iconPath, ...instance} = instanceSettings;

    return $utils.saveFile({
      data: JSON.stringify(instance, null, 2),
      path: INSTANCE_PATH + instance.id,
      filename: "instance.json"
    }).then(() => instanceSettings);
  }

  async saveIcon(instanceSettings: InstanceSettings) {
    let icon = instanceSettings.iconPath;
    logger.info("Saving instance icon ...")
    if(icon == null) {
      logger.debug("No icon to save for instance : " + instanceSettings.id);
      return;
    }

    let assetsPath = INSTANCE_PATH + instanceSettings.id + '/' + ASSETS_PATH;
    let iconFile = await $utils.readFile(icon, false, true);
    let filename = path.parse(icon).base;

    await $utils.saveFile({
      data: iconFile,
      path: assetsPath,
      filename: filename,
      binary: true
    });
    instanceSettings.iconPath = path.join(assetsPath, filename);
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    logger.info("Saving launcher settings ...");
    settings.instances = settings.instances.map(instance => {
      const {id, title, iconPath} = instance;
      return {
        id, title, iconPath
      };
    });

    if(InstanceServiceImpl.settings != null) {
      InstanceServiceImpl.settings.instances = settings.instances;
    }

    return $utils.saveFile({
      data: JSON.stringify(settings, null, 2),
      filename: SETTINGS_FILE
    }).then(() => settings);
  }
}
