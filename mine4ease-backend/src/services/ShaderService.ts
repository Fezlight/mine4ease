import {InstanceSettings, IShaderService, Shader} from "mine4ease-ipc-api";

export class ShaderService implements IShaderService {
    addShader(shader: Shader, instance: InstanceSettings): Promise<string> {
        return Promise.resolve("");
    }

    deleteShader(shader: Shader, instance: InstanceSettings): Promise<string> {
        return Promise.resolve("");
    }

    updateShader(targetShader: Shader, instance: InstanceSettings): Promise<string> {
        return Promise.resolve("");
    }
}