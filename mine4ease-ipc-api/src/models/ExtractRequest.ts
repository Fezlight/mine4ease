import {File} from "./file/File";

export class ExtractRequest {
  file: File;
  destPath: string;
  destName: string | undefined;
  excludes: string[];
  includes: string[];
}
