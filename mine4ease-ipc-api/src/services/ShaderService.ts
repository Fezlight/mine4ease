import {Shader} from "../models/file/Shader";
import {InstanceSettings} from "../models/instance/InstanceSettings";

export interface IShaderService {
    /**
     * Add a shader to an instance
     *
     * @param shader shader to add
     * @param instance instance object
     */
    addShader(shader: Shader, instance: InstanceSettings): Promise<string>;

    /**
     * Delete a mod from an instance
     *
     * @param shader shader to delete
     * @param instance instance object
     */
    deleteShader(shader: Shader, instance: InstanceSettings): Promise<string>;

    /**
     * Update a shader from an instance
     *
     * @param targetShader target shader with same id as the source shader
     * @param instance instance object
     */
    updateShader(targetShader: Shader, instance: InstanceSettings): Promise<string>;
}