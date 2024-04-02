import {getByType, IModService, InstanceSettings, Mod} from "mine4ease-ipc-api";

export class ModService implements IModService {
  addMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    return window.ipcRenderer.invoke('modService.addMod', JSON.stringify(mod), JSON.stringify(instance));
  }

  deleteMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    return window.ipcRenderer.invoke('modService.deleteMod', JSON.stringify(mod), JSON.stringify(instance));
  }

  updateMod(previousMod: Mod, instance: InstanceSettings): Promise<string> {
    return window.ipcRenderer.invoke('modService.updateMod', JSON.stringify(previousMod), JSON.stringify(instance));;
  }

  async isUpdateNeeded(mod: Mod, instance: InstanceSettings): Promise<boolean> {
    return getByType(mod.apiType).getFileById(mod.id, instance.versions.minecraft.name, mod.modLoader)
      .then((mods: Mod[]) => {
        return mods.findIndex(m => m.installedFileDate.getTime() > new Date(mod.installedFileDate).getTime()) != -1;
      });
  }
}
