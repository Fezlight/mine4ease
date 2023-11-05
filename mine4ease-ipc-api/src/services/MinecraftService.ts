import {File} from "../models/file/File";
import {InstanceSettings} from "../models/instance/InstanceSettings";
import {Assets, Libraries, Versions} from "../models/Manifest";
import {ChildProcess} from "child_process";

export const MINECRAFT_RESSOURCES_URL = "https://resources.download.minecraft.net"

export interface MinecraftService {

  /**
   * Download manifest file related to minecraft version.
   * Can be the version manifest (versions/X.XX.json) or the assets manifests (assets/indexes/X.json)
   *
   * @param file manifest file to download related to assets or versions manifest
   */
  downloadManifest?(file: File): Promise<Versions | Assets>;

  downloadAssets?(assets: Assets): Promise<any>;

  downloadLibraries?(instance: InstanceSettings, libraries: Libraries[]): Promise<any>;

  beforeLaunch?(instance: InstanceSettings): Promise<Versions>;

  launchGame(instance: InstanceSettings): Promise<ChildProcess>;
}
