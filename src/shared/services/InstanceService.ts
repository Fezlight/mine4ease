import {ApiType, CurseModPack, getByType, IInstanceService, InstanceSettings, ModPack} from "mine4ease-ipc-api";
import {v4 as uuidv4} from "uuid";

export class InstanceService implements IInstanceService {
  async createInstance(instance: InstanceSettings): Promise<InstanceSettings> {
    instance.id = uuidv4();

    instance.installSide = 'client';

    return window.ipcRenderer.invoke('instanceService.createInstance', JSON.stringify(instance));
  }

  async createInstanceByModPack(modpack: ModPack): Promise<string> {
    return window.ipcRenderer.invoke('instanceService.createInstanceByModPack', JSON.stringify(modpack));
  }

  selectInstance(id: string): Promise<void> {
    return window.ipcRenderer.invoke('instanceService.selectInstance', id);
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    return window.ipcRenderer.invoke('instanceService.getInstanceById', id);
  }

  async updateInstance(id: string): Promise<string> {
    return window.ipcRenderer.invoke('instanceService.updateInstance', id);
  }

  async deleteInstance(id: string): Promise<void> {
    return window.ipcRenderer.invoke('instanceService.deleteInstance', id);
  }

  openFolder(id: string) {
    return window.ipcRenderer.invoke('instanceService.openFolder', id);
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    return await window.ipcRenderer.invoke('instanceService.saveInstanceSettings', JSON.stringify(instanceSettings));
  }

  async isUpdateNeeded(instance: InstanceSettings): Promise<boolean> {
    if (instance.modPack && instance.apiType == ApiType.CURSE) {
      let modpack: CurseModPack = <CurseModPack>instance.modPack;

      return getByType(ApiType.CURSE).getFileById(undefined, instance.modPack.id, new ModPack(), instance.versions.minecraft.name, instance.modLoader)
      .then((modPack: ModPack[] | ModPack) => {
        if (Array.isArray(modPack)) {
          return modPack.findIndex(m => m.installedFileDate.getTime() > new Date(modpack.installedFileDate).getTime()) != -1;
        }
        return modPack.installedFileDate.getTime() > new Date(modpack.installedFileDate).getTime();
      });
    }

    return false;
  }
}
