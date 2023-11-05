import {InstanceSettings, MinecraftService} from "mine4ease-ipc-api";
import * as Process from "process";

export class MinecraftServiceImpl implements MinecraftService {
  launchGame(instance: InstanceSettings): Promise<typeof Process> {
    console.log(`Launching instance ${instance.id} ...`);
    return window.ipcRenderer.invoke('minecraftService.launchGame', JSON.stringify(instance));
  }
}
