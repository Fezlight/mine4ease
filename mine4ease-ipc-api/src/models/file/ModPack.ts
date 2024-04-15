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
  gameVersion: string;
  iconUrl: string;
  modLoader: ModLoader;
  apiType: ApiType;
  categories: Category[];
  links?: Links;
  downloadCount: number;

  mainPath(): string {
    return CACHE_PATH;
  }
}
