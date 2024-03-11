import {InstanceSettings} from "../models/instance/InstanceSettings";

export interface IInstanceService {
  /**
   * Create an instance
   *
   * @param instanceSettings instance object containing all information for creation
   */
  createInstance(instanceSettings: InstanceSettings): Promise<InstanceSettings>;

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
   * Delete an instance by its id
   *
   * @param id instance id shared with the external server
   */
  deleteInstance(id: string): Promise<void>;

  /**
   * Open instance folder by id
   * @param id instance id shared with the external server
   */
  openFolder(id: string);

  /**
   * Save instance settings
   *
   * @param instanceSettings instance specific settings to save
   */
  saveInstanceSettings(instanceSettings: InstanceSettings): Promise<InstanceSettings>;
}
