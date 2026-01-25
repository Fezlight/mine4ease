import {InstanceSettings, Services} from "mine4ease-ipc-api";

export class MinecraftService implements Services.IMinecraftService {
  launchGame(instance: InstanceSettings): Promise<string> {
    return window.ipcRenderer.invoke('minecraftService.launchGame', JSON.stringify(instance));
  }
}
