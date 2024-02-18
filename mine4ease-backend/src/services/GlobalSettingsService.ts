import {CacheProvider, IGlobalSettingService, IUtils, Settings} from "mine4ease-ipc-api";
import {SETTINGS_FILE, SETTINGS_KEY} from "../config/CacheConfig";
import {Logger} from "winston";
import {$cacheProvider, $utils, logger} from "../config/ObjectFactoryConfig.ts";

export class GlobalSettingsService implements IGlobalSettingService {
  private logger: Logger;
  private cacheProvider: CacheProvider;
  private utils: IUtils;

  constructor(logger: Logger, cacheProvider: CacheProvider, utils: IUtils) {
    this.logger = logger;
    this.cacheProvider = cacheProvider;
    this.utils = utils;
  }

  async retrieveSettings(): Promise<Settings> {
    this.logger.info("Retrieving launcher settings ...");

    let settings;
    if (this.cacheProvider.has(SETTINGS_KEY)) {
      settings = this.cacheProvider.loadObject(SETTINGS_KEY);
    } else {
      settings = await this.utils.readFile(SETTINGS_FILE)
        .catch(() => "{}")
        .then(JSON.parse);
    }

    if(!settings) {
      settings = {};
    }

    await this.cacheProvider.update(SETTINGS_KEY, settings);

    return Promise.resolve(settings);
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    this.logger.info("Saving launcher settings ...");
    settings.instances = settings.instances.map(instance => {
      const {id, title, iconName} = instance;
      return {
        id, title, iconName: iconName
      };
    });

    if (this.cacheProvider.has(SETTINGS_KEY)) {
      await this.cacheProvider.update(SETTINGS_KEY, settings);
    }

    return this.utils.saveFile({
      data: JSON.stringify(settings, null, 2),
      filename: SETTINGS_FILE
    }).then(() => settings);
  }
}

export const $globalSettingsService = new GlobalSettingsService(logger, $cacheProvider, $utils);
