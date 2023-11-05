import {File} from "./file/File";

export class ExtractRequest {
  file: File;
  destPath: string;
  excludes: string[];
}
