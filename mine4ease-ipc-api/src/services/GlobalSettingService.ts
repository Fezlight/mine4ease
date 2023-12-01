import {Settings} from "../models/Settings";

export interface IGlobalSettingService {
  /**
   * Retrieve launcher settings containing selected instance and list of instances
   */
  retrieveSettings(): Promise<Settings>;

  /**
   * Save global settings used by the launcher
   * @param settings global settings to save
   */
  saveSettings(settings: Settings): Promise<Settings>;
}
