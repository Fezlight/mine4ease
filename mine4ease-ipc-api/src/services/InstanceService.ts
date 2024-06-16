import {InstanceSettings} from "../models/instance/InstanceSettings";
import {ModPack} from "../models/file/ModPack";

export interface IInstanceService {
  /**
   * Create an instance
   *
   * @param instanceSettings instance object containing all information for creation
   */
  createInstance(instanceSettings: InstanceSettings): Promise<InstanceSettings>;

  /**
   * Create an instance with an existing mod pack
   *
   * @param modpack mod pack used to create an instance
   */
  createInstanceByModPack(modpack: ModPack): Promise<string>;

  /**
   * Select an instance
   *
   * @param id instance id shared with the external server
   */
  selectInstance(id: string) : Promise<void>;

  /**
   * Retrieve an instance by its id
   *
   * @param id instance id shared with the external server
   */
  getInstanceById(id: string): Promise<InstanceSettings>;

  /**
   * Update instance by it id
   *
   * @param id instance id shared with the external server
   */
  updateInstance(id: string): Promise<string>;

  /**
   * Delete an instance by its id
   *
   * @param id instance id shared with the external server
   */
  deleteInstance(id: string): Promise<void>;

  /**
   * Open instance folder by id
   * @param id instance id shared with the external server
   */
  openFolder(id: string): Promise<void>;

  /**
   * Save instance settings
   *
   * @param instanceSettings instance specific settings to save
   */
  saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings>;
}
