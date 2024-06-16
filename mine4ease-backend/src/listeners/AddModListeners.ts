import {EventListeners} from "./EventListeners.ts";
import {ADD_MOD_EVENT_NAME, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {EventEmitter} from "events";
import {$eventEmitter} from "../config/ObjectFactoryConfig";
import {$modService} from "../services/ModService";

export class AddModListeners implements EventListeners {
  private readonly _eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter = $eventEmitter) {
    this._eventEmitter = eventEmitter;
  }

  start() {
    this._eventEmitter.on(ADD_MOD_EVENT_NAME, this.subscribe);
  }

  private async subscribe(mod: Mod, instance: InstanceSettings): Promise<void> {
    let modsSettings = await $modService.getInstanceMods(instance.id);

    modsSettings.mods.set(String(mod.id), mod);

    await $modService.saveAllMods(modsSettings, instance.id);
  }

  stop() {
    this._eventEmitter.removeListener(ADD_MOD_EVENT_NAME, this.subscribe)
  }
}
