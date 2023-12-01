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

  static resolve(name: string): Library {
    const path = require("node:path");
    let [groupId, lib, version, extra] = name.split(':');

    let library = new Library();
    let libPath: string;
    if (extra) {
      libPath = path.join(groupId.replace('.', '/'), lib, version, `${lib}-${version}-${extra}.jar`);
    } else {
      libPath = path.join(groupId.replace('.', '/'), lib, version, `${lib}-${version}.jar`);
    }
    library.path = libPath;
    library.name = path.parse(libPath).name;
    library.extension = path.parse(libPath).ext;

    return library;
  }
}


