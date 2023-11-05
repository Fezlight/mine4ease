import {File} from "./File";

export const LIBRARIES_PATH = "/libraries"

export class Library extends File {
  mainPath(): string {
    return LIBRARIES_PATH;
  }
  filePath() : string {
    let [groupId, name ,version] = this.name.split(':');
    return this.mainPath + groupId.replace('.', '/') + name + version;
  }
}


