import {File} from "./File";

export const LIBRARIES_PATH = "/libraries"

export class Library extends File {
  mainPath(): string {
    return LIBRARIES_PATH;
  }

  set path(libPath: string) {
    let parts = libPath.split(/[/\\]/);
    parts.pop();
    this.subPath = parts.join("/");
  }

  static resolve(name: string): Library {
    let [n, extension] = name.split('@');
    let [groupId, lib, version, extra] = n.split(':');

    let library = new Library();
    let libPath: string;
    let groupPath = groupId.replaceAll(/\./g, "/");
    if (extra) {
      libPath = `${groupPath}/${lib}/${version}/${lib}-${version}-${extra}.jar`;
    } else {
      libPath = `${groupPath}/${lib}/${version}/${lib}-${version}.jar`;
    }

    library.path = libPath;
    
    let fileName = libPath.split(/[/\\]/).pop() || "";
    let dotIndex = fileName.lastIndexOf('.');
    if (dotIndex !== -1) {
      library.name = fileName.substring(0, dotIndex);
      library.extension = extension || fileName.substring(dotIndex);
    } else {
      library.name = fileName;
      library.extension = extension || "";
    }

    return library;
  }
}

export interface LegacyForgeLib {
  clientreq?:boolean;
  serverreq?: boolean;
}


