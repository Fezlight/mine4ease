import {File} from "./File";

export const RESOURCES_PACKS_PATH = "/resourcepacks"

export class ResourcePack extends File{
  mainPath(): string {
    return RESOURCES_PACKS_PATH;
  }

}
