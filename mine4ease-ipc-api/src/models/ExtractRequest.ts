import {File} from "./file/File";

export class ExtractRequest {
  file: File;
  destPath: string;
  destName?: string;
  destNameFilter?: string;
  excludes: string[];
  includes: string[];
  stripLeadingDirectory?: number;
}
