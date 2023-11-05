import {Instance, ResourcePack, InstanceService, InstanceSettings, Mod, ModLoader, Settings, Shader} from "mine4ease-ipc-api";
import {v4 as uuidv4} from "uuid";

export class InstanceServiceImpl implements InstanceService {
  addMod(instance: Instance, mod: Mod): Promise<Mod> {
    return Promise.resolve(mod);
  }

  addResourcePack(instance: Instance, resourcePack: ResourcePack): Promise<ResourcePack> {
    return Promise.resolve(resourcePack);
  }

  addShader(instance: Instance, shader: Shader): Promise<Shader> {
    return Promise.resolve(shader);
  }

  async createInstance(instance: InstanceSettings): Promise<InstanceSettings> {
    console.log("Creating an instance %s", JSON.stringify(instance));
    instance.id = uuidv4();

    let modLoader = instance.modLoader;
    if (modLoader === ModLoader.FORGE) {
      instance.versions.forge?.name.replace("forge-", "");
    }
    instance.installSide = 'client';

    return window.ipcRenderer.invoke('instanceService.createInstance', JSON.stringify(instance));
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    console.log("Retrieve instance with id : " + id);
    return window.ipcRenderer.invoke('instanceService.getInstanceById', id);
  }

  async deleteInstance(id: string): Promise<void> {
    console.log("Deleting instance with id : " + id);
    return window.ipcRenderer.invoke('instanceService.deleteInstance', id);
  }

  async retrieveSettings(): Promise<Settings> {
    return await window.ipcRenderer.invoke('instanceService.retrieveSettings');
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    console.log("Saving global settings...");
    return await window.ipcRenderer.invoke('instanceService.saveSettings', JSON.stringify(settings));
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    console.log(`Saving instance ${instanceSettings.id} settings ...`, instanceSettings.id);
    return await window.ipcRenderer.invoke('instanceService.saveInstanceSettings', JSON.stringify(instanceSettings));
  }
}
