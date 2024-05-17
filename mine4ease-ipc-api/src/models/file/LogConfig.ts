import {File} from "./File";
import {ASSETS_PATH} from "./Asset";

export const LOG_SUB_PATH = "/log_configs"

export class LogConfig extends File {
  subPath = LOG_SUB_PATH;

  mainPath(): string {
    return ASSETS_PATH;
  }
}
