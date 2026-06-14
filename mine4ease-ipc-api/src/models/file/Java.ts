import {File} from "./File";

const JAVA_PATH = "/runtimes"

export class Java extends File {
  type?: string;

  mainPath(): string {
    return JAVA_PATH + "/" + (this.type ?? "");
  }

  set path(javaPath: string) {
    let parts = javaPath.split(/[/\\]/);
    parts.pop();
    this.subPath = parts.join("/");
  }
}
