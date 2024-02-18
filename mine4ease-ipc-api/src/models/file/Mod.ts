import {ApiType} from "../../services/ApiService";
import {File} from "./File";

export const MODS_PATH = "/mods"

export class Mod extends File {
  id: string;
  eventId: string;
  displayName: string;
  authors: { id: string, name: string }[];
  description: string;
  gameVersion: string;
  iconUrl: string;
  modLoader: ModLoader;
  apiType: ApiType;
  dependencies: Mod[];
  categories: Category[];
  relationType?: number;

  mainPath(): string {
    return MODS_PATH;
  }
}

export class Category {
  id: number;
  name: string;
  iconUrl: string;
}

export enum ModLoader {
  FORGE = "Forge", FABRIC = "Fabric", QUILT = "Quilt",
}

export enum ModLoaderCurse {
  Forge = 1,
  Fabric = 4,
  Quilt = 5
}


