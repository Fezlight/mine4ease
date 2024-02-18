import {Mod, Task} from "mine4ease-ipc-api";
import {$eventEmitter, logger} from "../config/ObjectFactoryConfig";

export class UninstallModTask extends Task {

  constructor(mod: Mod) {
    super($eventEmitter, logger, () => `Uninstalling mod ${mod.name}...`);
  }

  run(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
