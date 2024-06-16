import {ADD_TASK_EVENT_NAME, IModService, INSTANCE_PATH, InstanceSettings, Mod, ModSettings} from "mine4ease-ipc-api";
import {InstallModTask} from "../task/InstallModTask";
import {$eventEmitter, $utils} from "../config/ObjectFactoryConfig";
import {join} from "node:path";
import {UninstallModTask} from "../task/UninstallModTask";
import {UpdateModTask} from "../task/UpdateModTask";

export class ModService implements IModService {
  async addMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    let task = new InstallModTask(mod, instance);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }

  async deleteMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    let task = new UninstallModTask(mod, instance);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }

  async updateMod(previousMod: Mod, instance: InstanceSettings): Promise<string> {
    let task = new UpdateModTask(previousMod, instance);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }

  async getMod(modId: number, instanceId: string): Promise<Mod | undefined> {
    return $utils.readFile(join(INSTANCE_PATH, instanceId, "mods.json"))
    .then(JSON.parse)
    .then((modSettings: ModSettings) => {
      return Object.values(modSettings.mods).find((mod:Mod)=> mod.id === modId);
    })
    .catch(() => undefined);
  }

  async getInstanceMods(instanceId: string): Promise<ModSettings> {
    return $utils.readFile(join(INSTANCE_PATH, instanceId, "mods.json"))
      .then(JSON.parse)
      .then(modSettings => {
        modSettings.mods = new Map(Object.entries(modSettings.mods));
        return modSettings;
      })
      .catch(() => new ModSettings());
  }

  async saveAllMods(modSettings: ModSettings, instanceId: string): Promise<void> {
    let modsJson = {
      mods: Object.fromEntries(modSettings.mods)
    };

    await $utils.saveFile({
      data: JSON.stringify(modsJson, null, 2),
      path: join(INSTANCE_PATH, instanceId),
      filename: "mods.json"
    });
  }

  async countMod(instanceId: string) {
    let modsJson: ModSettings = await $utils.readFile(join(INSTANCE_PATH, instanceId, "mods.json"))
      .then(JSON.parse)
      .catch(() => {});

    return modsJson.mods.size;
  }
}

export const $modService = new ModService();
