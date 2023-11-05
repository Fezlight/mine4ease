import {Instance} from "./Instance";
import {ModLoader} from "./file/Mod";

export interface InstanceSettings extends Instance {
  description?: string;
  modLoader?: ModLoader;
  versions: { forge?: string, minecraft: string; fabric?: string, quilt?: string, self?: string };
}
