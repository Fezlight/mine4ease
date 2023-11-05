import {File} from "./File";

export const ASSETS_PATH = "/assets"

export class Asset extends File {
  mainPath(): string {
    return ASSETS_PATH;
  }

  filePath() : string {
    return this.mainPath + this.name.substring(0, 2);
  }
}
