import {File} from "./File";

export const CACHE_PATH = "/caches"

export class CachedFile extends File {
  mainPath(): string {
    return CACHE_PATH;
  }
}
