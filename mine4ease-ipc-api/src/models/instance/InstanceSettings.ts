import {Instance} from "./Instance";
import {ModLoader} from "../file/Mod";
import {Version} from "../file/Version";
import {InstallSide} from "../Rule";

export interface InstanceSettings extends Instance {
  installSide: InstallSide;
  description?: string;
  modLoader?: ModLoader;
  versions: {
    forge?: Version,
    minecraft: Version;
    fabric?: Version,
    quilt?: Version,
    self?: string
  };
}
