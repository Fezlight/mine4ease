import {File} from "./File";

const JAVA_PATH = "/runtimes"

export class Java extends File {
  type?: string;

  mainPath(): string {
    const path = require("node:path");
    return path.join(JAVA_PATH, this.type ?? "");
  }

  set path(javaPath: string) {
    const path = require("node:path");
    this.subPath = path.parse(javaPath).dir;
  }
}
