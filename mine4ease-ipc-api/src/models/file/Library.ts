import {File} from "./File";

export const LIBRARIES_PATH = "/libraries"

export class Library extends File {
  mainPath(): string {
    return LIBRARIES_PATH;
  }

  set path(libPath: string) {
    const path = require("node:path");
    this.subPath = path.parse(libPath).dir;
  }
}


