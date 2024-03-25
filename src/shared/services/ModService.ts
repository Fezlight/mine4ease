import {IModService} from "mine4ease-ipc-api/src/services/ModService";
import {InstanceSettings, Mod} from "mine4ease-ipc-api";

export class ModService implements IModService {
  addMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    return window.ipcRenderer.invoke('modService.addMod', JSON.stringify(mod), JSON.stringify(instance));
  }

  deleteMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    return Promise.resolve("");
  }

  updateMod(targetMod: Mod, instance: InstanceSettings): Promise<string> {
    return Promise.resolve("");
  }
}
