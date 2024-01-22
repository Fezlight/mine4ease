import {DownloadRequest, Java, Task, TaskRunner} from "mine4ease-ipc-api";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {DownloadFileTask} from "./FileTask.ts";
import {EventEmitter} from "events";
import path from "node:path";

const MOJANG_JAVA_URL = "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";

export class DownloadJavaTask extends Task {
  private readonly javaType: string
  private readonly osSpecs: {
    OS: string;
    platform: string
  };
  private readonly subEventEmitter: EventEmitter;
  private readonly taskRunner: TaskRunner;

  constructor(javaType: string) {
    super($eventEmitter, logger, () => `Checking java '${javaType}'...`);
    this.javaType = javaType;
    this.osSpecs = $utils.getPlatform();
    this.subEventEmitter = new EventEmitter();
    this.taskRunner = new TaskRunner(logger, this.subEventEmitter);
  }

  async run(): Promise<void> {
    const javaVersionsManifest = await fetch(MOJANG_JAVA_URL)
    .then(data => data.json());

    const platform = `${this.osSpecs.OS}-${this.osSpecs.platform}`;

    let url: string = "";
    let javaVersion = javaVersionsManifest[platform] ?? javaVersionsManifest[this.osSpecs.OS];
    if (javaVersion && javaVersion[this.javaType]) {
      url = javaVersion[this.javaType][0].manifest.url;
    } else if (javaVersion !== javaVersionsManifest[this.osSpecs.OS] && javaVersionsManifest[this.osSpecs.OS][this.javaType]) {
      url = javaVersionsManifest[this.osSpecs.OS][this.javaType][0].manifest.url;
    }

    const javaFiles = await fetch(url)
    .then(data => data.json());

    if (javaFiles.files) {
      let files: Map<string, any> = new Map<string, any>(Object.entries(javaFiles.files));

      process.env.JAVA_PATH = path.join("runtimes", this.javaType);

      for (const [filePath, file] of files) {
        if (!file.downloads) continue;

        let downloadReq = new DownloadRequest();
        let java: Java = Object.assign(new Java(), file.downloads.raw);
        java.path = filePath;
        java.type = this.javaType;
        downloadReq.file = java;

        this.taskRunner.addTask(new DownloadFileTask(downloadReq));
      }
    } else {
      throw new Error(`No files found for ${this.javaType}`);
    }

    await this.taskRunner.process();
  }
}
