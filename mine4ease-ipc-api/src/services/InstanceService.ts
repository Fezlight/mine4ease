export interface InstanceService {
  /**
   * Create an instance
   */
  createInstance(): Promise<Instance>;

  deleteInstance(id: string);


}

