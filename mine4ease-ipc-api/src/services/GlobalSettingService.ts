import {Settings} from "../models/Settings";

export interface GlobalSettingService {
  /**
   * Save global settings used by the launcher
   * @param settings global settings to save
   */
  saveSettings(settings: Settings): Promise<Settings>;
}
