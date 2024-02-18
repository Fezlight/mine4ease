import {IModService} from "mine4ease-ipc-api/src/services/ModService";
import {ADD_TASK_EVENT_NAME, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {InstallModTask} from "../task/InstallModTask";
import {$eventEmitter} from "../config/ObjectFactoryConfig";

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

}

export const $modService = new ModService();
