import {File} from "./File";

export const SHADERS_PATH = "/shaderpacks"

export class Shader extends File {
  mainPath(): string {
    return SHADERS_PATH;
  }
}
