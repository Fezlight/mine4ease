import {File} from "./file/File";
import {RuleControl} from "./Rule";

export class DownloadRequest extends RuleControl{
  file: File;
  mirrors?: string[];

  needDownload(): boolean {
    // No rule = true or value of all rules with AND
    let cond = super.isRuleValid();

    // Current hash differ from source
    cond &&= this.file?.isHashInvalid();

    return cond;
  }
}
