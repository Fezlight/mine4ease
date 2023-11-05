import {Instance, InstanceService, InstanceSettings, Mod, Settings, Shader} from "mine4ease-ipc-api";
import {ResourcePack} from "mine4ease-ipc-api/src/models/ResourcePack";

export class FrontInstanceService implements InstanceService {
  addMod(instance: Instance, mod: Mod): Promise<Mod> {
    return Promise.resolve(undefined);
  }

  addResourcePack(instance: Instance, resourcePack: ResourcePack): Promise<ResourcePack> {
    return Promise.resolve(undefined);
  }

  addShader(instance: Instance, shader: Shader): Promise<Shader> {
    return Promise.resolve(undefined);
  }

  createInstance(instance: Instance): Promise<Instance> {
    return Promise.resolve(undefined);
  }

  deleteInstance(id: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  retrieveSettings(): Promise<Settings> {
    return Promise.resolve(undefined);
  }

  saveSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings> {
    return Promise.resolve(undefined);
  }

}
