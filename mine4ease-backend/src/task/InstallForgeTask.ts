import {CachedFile, DownloadRequest, Task} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, logger} from "../config/ObjectFactoryConfig";

export class InstallForgeTask extends Task {
  private readonly minecraftVersion: string;
  private readonly forgeVersion: string;

  constructor(minecraftVersion: string, forgeVersion: string) {
    super($eventEmitter, logger, () => `Installing forge ${forgeVersion}...`);
    this.minecraftVersion = minecraftVersion;
    this.forgeVersion = forgeVersion;
  }

  async run(): Promise<void> {
    let installerFile = new CachedFile();
    installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${this.minecraftVersion}-${this.forgeVersion}/forge-${this.minecraftVersion}-${this.forgeVersion}-installer.jar`;

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await $downloadService.download(downloadRequest);

    // TODO
    

    return Promise.resolve(undefined);
  }
}
