import {InstanceSettings, MinecraftService} from "mine4ease-ipc-api";
import {ChildProcess} from "child_process";

export class MinecraftServiceImpl implements MinecraftService {
  launchGame(instance: InstanceSettings): Promise<ChildProcess> {
    console.log(`Launching instance ${instance.id} ...`);
    return window.ipcRenderer.invoke('minecraftService.launchGame', JSON.stringify(instance));
  }
}
