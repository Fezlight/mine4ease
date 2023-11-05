import {File} from "./File";

export const ASSETS_PATH = "/assets"
export const ASSETS_SUB_PATH = "/objects"
export const ASSETS_SUB_PATH_LEGACY = "/virtual/legacy"

export class Asset extends File {
  mainPath(): string {
    return ASSETS_PATH;
  }

  set hash(hash: string) {
    this.sha1 = hash;
    this.name = hash;
  }

  set virtual(virtual: boolean) {
    if(virtual) {
      this.subPath = ASSETS_SUB_PATH_LEGACY;
    } else {
      this.subPath = ASSETS_SUB_PATH;
    }
  }
}
