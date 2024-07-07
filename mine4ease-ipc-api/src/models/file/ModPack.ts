import {File} from "./File";
import {Category, Links, ModLoader} from "./Mod";
import {ApiType} from "../../services/ApiService";
import {CACHE_PATH} from "./CachedFile";

export class ModPack extends File {
  id: number;
  eventId?: string;
  displayName: string;
  authors: { id: string, name: string }[];
  summary: string;
  installedFileId: number;
  installedFileDate: Date;
  description: string;
  files: File[];
  version: { id: string, name: string, updated: Date };
  gameVersion?: string;
  gameVersions: string[];
  iconUrl: string;
  modLoader: ModLoader;
  modLoaderId?: string;
  apiType: ApiType;
  categories: Category[];
  links?: Links | Link[];
  downloadCount: number;

  mainPath(): string {
    return CACHE_PATH;
  }
}

export class Link {
  id: string;
  link: string;
  name: string;
  type: string;
}
