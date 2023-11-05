import {ApiType} from "../../services/ApiService";
import {File} from "./File";

export const MODS_PATH = "/mods"

export class Mod extends File {
  id: string;
  gameVersion: string;
  iconUrl: string;
  modLoader: ModLoader;
  apiType: ApiType;
  dependencies: Mod[];
  relationType?: string;

  mainPath(): string {
    return MODS_PATH;
  }
}

export enum ModLoader {
  FORGE = "Forge", FABRIC = "Fabric", QUILT = "Quilt",
}

export enum ModLoaderCurse {
  Forge = 1,
  Fabric = 4,
  Quilt = 5
}


