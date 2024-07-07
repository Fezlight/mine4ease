import {File} from "./File";

export class BasicFile extends File {
  _mainPath: string;

  mainPath(): string {
    return this._mainPath;
  }
}
