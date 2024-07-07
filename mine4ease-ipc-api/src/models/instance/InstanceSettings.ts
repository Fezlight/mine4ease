import {Instance} from "./Instance";
import {ModLoader} from "../file/Mod";
import {Version} from "../file/Version";
import {InstallSide} from "../Rule";
import {ApiType} from "../../services/ApiService";
import {CurseModPack} from "../modpack/CurseModPack";
import {ModrinthModPack} from "../modpack/ModrinthModPack";
import {FeedTheBeastModPack} from "../modpack/FeedTheBeastModPack";

export class InstanceSettings extends Instance {
  installSide: InstallSide;
  description?: string;
  modLoader?: ModLoader;
  additionalJvmArgs: string;
  memory: string;
  apiType: ApiType;
  modPack: CurseModPack | ModrinthModPack | FeedTheBeastModPack;
  versions: {
    forge?: Version,
    minecraft: Version;
    fabric?: Version,
    quilt?: Version,
    self?: string
  };
}
