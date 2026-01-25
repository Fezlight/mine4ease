import {IGlobalSettingService, Settings} from "mine4ease-ipc-api";

export class GlobalSettingsService implements IGlobalSettingService {
  async retrieveSettings(): Promise<Settings> {
    return window.ipcRenderer.invoke('globalSettingsService.retrieveSettings');
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    return window.ipcRenderer.invoke('globalSettingsService.saveSettings', JSON.stringify(settings));
  }
}
