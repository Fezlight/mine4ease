import {Asset, Assets, DownloadRequest, MINECRAFT_RESSOURCES_URL, Task, TaskRunner, Versions} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {join, parse} from "path";

export class DownloadAssetsTask extends Task {
  private readonly taskRunner: TaskRunner;
  private readonly subEventEmitter: EventEmitter;
  private readonly assetsFile: Asset;

  constructor(versionFile: Versions) {
    super($eventEmitter, logger, () => "Checking Assets ...");
    this.subEventEmitter = new EventEmitter();
    this.taskRunner = new TaskRunner(logger, this.subEventEmitter, this._eventEmitter);
    this.assetsFile = Object.assign(new Asset(), versionFile.assetIndex);
    this.assetsFile.subPath = 'indexes';
  }

  async run(): Promise<void> {
    let downloadReq = new DownloadRequest();
    downloadReq.file = this.assetsFile;
    await $downloadService.download(downloadReq);

    let assetsFile: Assets = await $utils.readFile(join(this.assetsFile.fullPath(), this.assetsFile.fileName()))
    .then(JSON.parse)
    .then(assets => Object.assign(new Assets(), assets));

    let assets = assetsFile.objects;
    logger.info(`Checking ${assets.size} assets...`);

    for (const [name, asset] of assets) {
      this.taskRunner.addTask(new DownloadAssetTask(this.subEventEmitter, asset, name, assetsFile.virtual));
    }

    await this.taskRunner.process(false);
  }
}

export class DownloadAssetTask extends Task {
  private readonly asset: Asset;
  private readonly path: string;
  private readonly isVirtual: boolean;

  constructor(eventEmitter: EventEmitter, asset: Asset, path: string, isVirtual: boolean = false) {
    super(eventEmitter, logger, () => `Checking asset ${path}`, true);
    this.asset = Object.assign(new Asset(), asset);
    this.path = path;
    this.isVirtual = isVirtual;
  }

  async run(): Promise<void> {
    let asset = this.asset;
    asset.virtual = this.isVirtual;

    let folder = asset.sha1!.substring(0, 2);
    asset.url = MINECRAFT_RESSOURCES_URL + `/${folder}/${asset.name}`
    if (this.isVirtual) {
      asset.subPath = `${asset.subPath}/${parse(this.path).dir}`;
      asset.name = parse(this.path).name;
      asset.extension = parse(this.path).ext;
    } else {
      asset.subPath = `${asset.subPath}/${folder}`;
    }

    await $downloadService.initFileHash(asset);

    if (asset.isHashInvalid()) {
      let downloadReq = new DownloadRequest();
      downloadReq.file = asset;

      await $downloadService.download(downloadReq);
    }
  }
}
