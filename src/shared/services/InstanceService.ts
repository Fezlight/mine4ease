import {IInstanceService, InstanceSettings} from "mine4ease-ipc-api";
import {v4 as uuidv4} from "uuid";

export class InstanceService implements IInstanceService {
  async createInstance(instance: InstanceSettings): Promise<InstanceSettings> {
    instance.id = uuidv4();

    instance.installSide = 'client';

    return window.ipcRenderer.invoke('instanceService.createInstance', JSON.stringify(instance));
  }

  selectInstance(id: string): Promise<void> {
    return window.ipcRenderer.invoke('instanceService.selectInstance', id);
  }

  async getInstanceById(id: string): Promise<InstanceSettings> {
    return window.ipcRenderer.invoke('instanceService.getInstanceById', id);
  }

  async deleteInstance(id: string): Promise<void> {
    return window.ipcRenderer.invoke('instanceService.deleteInstance', id);
  }

  async saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    return await window.ipcRenderer.invoke('instanceService.saveInstanceSettings', JSON.stringify(instanceSettings));
  }
}
