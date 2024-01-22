import {File} from "./File";

export const VERSIONS_PATH = "/versions"

export class Version extends File {
  latest?: boolean;
  recommended?: boolean;
  installed?: boolean;

  set name(name: string) {
    this._name = name;
    this.subPath = name;
  }

  get name() {
    return this._name;
  }

  mainPath(): string {
    return VERSIONS_PATH;
  }
}
