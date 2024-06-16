import {EventListeners} from "./EventListeners.ts";
import {DELETE_MOD_EVENT_NAME, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {EventEmitter} from "events";
import {$eventEmitter} from "../config/ObjectFactoryConfig";
import {$modService} from "../services/ModService";

export class DeleteModListeners implements EventListeners {
  private readonly _eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter = $eventEmitter) {
    this._eventEmitter = eventEmitter;
  }

  start() {
    this._eventEmitter.on(DELETE_MOD_EVENT_NAME, this.subscribe);
  }

  private async subscribe(mod: Mod, instance: InstanceSettings): Promise<void> {
    let modsSettings = await $modService.getInstanceMods(instance.id);

    modsSettings.mods.delete(String(mod.id));

    await $modService.saveAllMods(modsSettings, instance.id);
  }

  stop() {
    this._eventEmitter.removeListener(DELETE_MOD_EVENT_NAME, this.subscribe)
  }
}
