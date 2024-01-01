import {DownloadRequest, ExtractRequest, Task} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";

export class DownloadFileTask extends Task {
  private readonly downloadRequest: DownloadRequest;

  constructor(downloadRequest: DownloadRequest, eventCancelled: boolean = true) {
    super($eventEmitter, logger, () => `Downloading file ${downloadRequest.file.fileName()} ...`, eventCancelled);
    this.downloadRequest = downloadRequest;
  }

  async run(): Promise<void> {
    await $downloadService.download(this.downloadRequest);
  }
}

export class ExtractFileTask extends Task {
  private readonly extractReq: ExtractRequest;

  constructor(extractReq: ExtractRequest, eventCancelled: boolean = true) {
    super($eventEmitter, logger, () => `Extracting file ${extractReq.file.fileName()} to ${extractReq.destPath} ...`, eventCancelled);
    this.extractReq = extractReq;
  }

  async run(): Promise<void> {
    await $utils.extractFile(this.extractReq);
  }
}
