import {Instance} from "../models/instance/Instance";
import {InstanceSettings} from "../models/instance/InstanceSettings";
import {Mod} from "../models/file/Mod";
import {ResourcePack} from "../models/file/ResourcePack";
import {Shader} from "../models/file/Shader";
import {Settings} from "../models/Settings";

export interface InstanceService {
  /**
   * Create an instance
   *
   * @param instanceSettings instance object containing all information for creation
   */
  createInstance(instanceSettings: InstanceSettings): Promise<InstanceSettings>;

  /**
   * Retrieve an instance by its id
   *
   * @param id instance id shared with the external server
   */
  getInstanceById(id: string): Promise<InstanceSettings>;

  /**
   * Delete an instance by its id
   *
   * @param id instance id shared with the external server
   */
  deleteInstance(id: string): Promise<void>;

  /**
   * Save instance settings
   *
   * @param instanceSettings instance specific settings to save
   */
  saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings>;

  /**
   * Add a mod to an instance
   *
   * @param instance instance object
   * @param mod mod to add
   */
  addMod(instance: Instance, mod: Mod): Promise<Mod>;

  /**
   * Add a resource pack to an instance
   *
   * @param instance instance object
   * @param resourcePack resource pack to add
   */
  addResourcePack(instance: Instance, resourcePack: ResourcePack): Promise<ResourcePack>;

  /**
   * Add a shader to an instance
   *
   * @param instance instance object
   * @param shader shader to add
   */
  addShader(instance: Instance, shader: Shader): Promise<Shader>;

  /**
   * Retrieve launcher settings containing selected instance and list of instances
   */
  retrieveSettings(): Promise<Settings>;

  /**
   * Save launcher settings
   *
   * @param settings launcher settings to save
   */
  saveSettings(settings: Settings): Promise<Settings>;
}
