import {InstanceSettings} from "../models/instance/InstanceSettings";
import {Mod} from "../models/file/Mod";

export interface IModService {
  /**
   * Add a mod to an instance
   *
   * @param mod mod to add
   * @param instance instance object
   */
  addMod(mod: Mod, instance: InstanceSettings): Promise<string>;

  /**
   * Delete a mod from an instance
   *
   * @param mod mod to add
   * @param instance instance object
   */
  deleteMod(mod: Mod, instance: InstanceSettings): Promise<void>;

  /**
   * Update a mod from an instance
   *
   * @param targetMod target mod with same id as the source mod
   * @param instance instance object
   */
  updateMod(targetMod: Mod, instance: InstanceSettings): Promise<string>;
}
