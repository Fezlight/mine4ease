import {IModService} from "mine4ease-ipc-api/src/services/ModService";
import {ADD_TASK_EVENT_NAME, INSTANCE_PATH, InstanceSettings, Mod, ModSettings} from "mine4ease-ipc-api";
import {InstallModTask} from "../task/InstallModTask";
import {$eventEmitter, $utils} from "../config/ObjectFactoryConfig";
import {join} from "path";

export class ModService implements IModService {
  async addMod(mod: Mod, instance: InstanceSettings): Promise<string> {
    let task = new InstallModTask(mod, instance);
    $eventEmitter.emit(ADD_TASK_EVENT_NAME, task);
    return task.id;
  }

  deleteMod(mod: Mod, instance: InstanceSettings): Promise<void> {
    return Promise.resolve(undefined);
  }

  updateMod(previousMod: Mod, instance: InstanceSettings): Promise<string> {
    return Promise.resolve("");
  }

  async countMod(instanceId: string) {
    let modsJson: ModSettings = await $utils.readFile(join(INSTANCE_PATH, instanceId, "mods.json"))
      .then(JSON.parse)
      .catch(() => {});

    return modsJson.mods.size;
  }

}

export const $modService = new ModService();
