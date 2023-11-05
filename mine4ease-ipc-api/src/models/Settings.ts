import {Instance} from "./instance/Instance";

export interface Settings {
  selectedInstance?: string,
  instances: Instance[];
}
