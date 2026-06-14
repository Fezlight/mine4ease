import {
  CACHE_PATH,
  CachedFile,
  DownloadRequest,
  ExtractRequest,
  File,
  InstallSide,
  Library,
  Task,
  TaskRunner,
  Version,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {EventEmitter} from "events";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {join} from "path";
import {DeleteFileTask, ExtractFileTask} from "./FileTask.ts";
import {DownloadLibrariesTask, SEPARATOR} from "./DownloadLibsTask.ts";
import {spawn} from "child_process";

export class InstallNeoForgeTask extends Task {
  protected readonly _taskRunner: TaskRunner;
  protected readonly _minecraftVersion: string;
  protected readonly _neoForgeVersion: string;
  protected readonly _installSide: InstallSide;
  protected readonly _subEventEmitter: EventEmitter;
  protected readonly _versionJsonName: string;

  constructor(minecraftVersion: string, neoForge: Version, installSide: InstallSide) {
    super($eventEmitter, logger, () => `Installing ${neoForge.name}...`);
    this._minecraftVersion = minecraftVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
    this._neoForgeVersion = neoForge.name.replace('neoforge-', '');
    this._installSide = installSide;
    this._versionJsonName = `${this._minecraftVersion}-neoforge-${this._neoForgeVersion}.json`;
  }

  async run(): Promise<void> {
    let forgeVersionPath = join(VERSIONS_PATH, this._versionJsonName.replace('.json', ''));
    let alreadyInstalled = await $utils.isFileExist(join(forgeVersionPath, '.installed'));
    if(!alreadyInstalled) {
      let installerFile = await this.downloadInstaller();

      let extractRequest = new ExtractRequest();
      extractRequest.file = installerFile;
      extractRequest.destPath = forgeVersionPath;
      extractRequest.includes = [
        "install_profile.json"
      ];

      // Extract install_profiles.json
      await $utils.extractFile(extractRequest);

      const installProfile = await $utils.readFile(join(extractRequest.destPath, "install_profile.json"))
      .then(JSON.parse);

      await this.runProcess(forgeVersionPath, installerFile, installProfile);

      this._taskRunner.addTask(new DeleteFileTask(join(installerFile.fullPath(), installerFile.fileName()),
        true));
    } else {
      const versionJson = await $utils.readFile(join(forgeVersionPath, this._versionJsonName))
      .then(JSON.parse);

      this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
        this._installSide, true, this._subEventEmitter, true));
    }

    await this._taskRunner.process();

    const fs = require('node:fs');
    fs.writeFile(join(process.env.APP_DIRECTORY, forgeVersionPath, '.installed'), '', (err: NodeJS.ErrnoException) => {
      if(err) throw Error('Error when writing validation file \'.installed\'');
    });
  }

  async runProcess(forgeVersionPath: string, installerFile: File, installProfile: any) {
    let extractRequest = new ExtractRequest();
    extractRequest.file = installerFile;
    extractRequest.destPath = forgeVersionPath;
    extractRequest.destName = this._versionJsonName;
    extractRequest.includes = [
      "version.json"
    ];

    // Extract forge version.json
    await $utils.extractFile(extractRequest);

    const versionJson = await $utils.readFile(join(forgeVersionPath, this._versionJsonName))
    .then(JSON.parse);

    this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
      this._installSide, true, this._subEventEmitter));

    this._taskRunner.addTask(new DownloadLibrariesTask(installProfile.libraries, this._minecraftVersion,
      this._installSide, false, this._subEventEmitter));

    const map = new Map<string, string>();
    for (const [key, value] of Object.entries(installProfile.data)) {
      map.set(key, (value as any)[this._installSide]);
    }

    const processors = installProfile.processors as any[];

    let needDeleteLZMA = false;
    for (const processor of processors) {
      if (processor.sides && !processor.sides.includes(this._installSide)) {
        continue;
      }

      if (processor.args.includes('{BINPATCH}')) {
        const extractLZMARequest = new ExtractRequest();
        extractLZMARequest.file = installerFile;
        extractLZMARequest.destName = `${this._installSide}.lzma`;
        extractLZMARequest.destPath = CACHE_PATH;
        extractLZMARequest.includes = [
          `data/${this._installSide}.lzma`
        ];

        this._taskRunner.addTask(new ExtractFileTask(extractLZMARequest, false));
        needDeleteLZMA = true;
      }

      this._taskRunner.addTask(new InstallNeoForgeProcessorTask(processor.jar, processor.classpath, processor.args,
        this._installSide, this._minecraftVersion, map, this._subEventEmitter));
    }

    if (needDeleteLZMA) {
      this._taskRunner.addTask(new DeleteFileTask(join(CACHE_PATH, `${this._installSide}.lzma`)));
    }
  }

  async downloadInstaller(): Promise<File> {
    let installerFile = new CachedFile();
    installerFile.url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${this._neoForgeVersion}/neoforge-${this._neoForgeVersion}-installer.jar`;

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await $downloadService.download(downloadRequest);

    return installerFile;
  }
}

export class InstallNeoForgeProcessorTask extends Task {
  private readonly _jar: string;
  private readonly _classpath: string[];
  private readonly _args: string[];
  private readonly _installSide: InstallSide;
  private readonly _mappings: Map<string, string>;
  private readonly _minecraftVersion: string;

  constructor(jar: string, classpath: string[], args: string[], installSide: InstallSide, minecraftVersion: string, mappings: Map<string, string>, eventEmitter: EventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => `Installing NeoForge processor ${jar} ...`, true);
    this._jar = jar;
    this._classpath = classpath;
    this._args = args;
    this._installSide = installSide;
    this._mappings = mappings;
    this._minecraftVersion = minecraftVersion;
  }

  async run(): Promise<void> {
    if (!process.env.JAVA_PATH) {
      throw new Error("No java executable was found");
    }
    let javaPath = join(process.env.APP_DIRECTORY, process.env.JAVA_PATH);

    let classpath: string[] = [];
    for (const lib of this._classpath) {
      let library = Library.resolve(lib);
      classpath.push(join(process.env.APP_DIRECTORY, library.fullPath(), library.fileName()))
    }

    let library = Library.resolve(this._jar);
    classpath.push(join(process.env.APP_DIRECTORY, library.fullPath(), library.fileName()));

    let mainClass: string | undefined = await $utils.readFileMainClass(join(library.fullPath(), library.fileName()));

    let regexIdentifier = /{(\w*)}/;
    for (let i = 0; i < this._args.length; i++) {
      let newValue: string | undefined = undefined;

      if (RegExp(regexIdentifier).exec(this._args[i])) {
        let argIdentifier;
        do {
          argIdentifier = RegExp(regexIdentifier).exec(this._args[i]);

          if (!argIdentifier) {
            break;
          }

          switch (argIdentifier[1]) {
            case 'MINECRAFT_JAR':
              newValue = join(process.env.APP_DIRECTORY, VERSIONS_PATH, this._minecraftVersion, this._minecraftVersion + '.jar');
              break;
            case 'SIDE':
              newValue = this._installSide;
              break;
            case 'ROOT':
              newValue = join(process.env.APP_DIRECTORY);
              break;
            case 'BINPATCH':
              let c = new CachedFile();
              c.url = this._mappings.get(argIdentifier[1]) || "";
              newValue = join(process.env.APP_DIRECTORY, c.fullPath(), c.fileName());
              break;
            default:
              newValue = this._mappings.get(argIdentifier[1]);
              break;
          }

          if (newValue != null) {
            this._args[i] = this._args[i].replace(regexIdentifier, newValue);
          } else {
            break;
          }
        } while (argIdentifier);
      }

      this._args[i] = this.replaceLibPath(this._args[i]);
    }

    if (!mainClass) {
      throw new Error("Cannot find mainClass");
    }

    let cp = classpath.join(SEPARATOR);
    let cmdLine = ["-cp", `${cp}`, mainClass, ...this._args];
    this._log.debug(`Command Line : ${cmdLine}`);

    return new Promise((resolve, reject) => {
      const processus: any = spawn(join(javaPath, $utils.getJavaExecutablePath()), cmdLine, {
        cwd: join(process.env.APP_DIRECTORY)
      });

      processus.stdout.on('data', (data) => {
        this._log.debug(`${data}`);
      });

      processus.stderr.on('data', (data) => {
        this._log.error(`${data}`);
      });

      processus.on('error', (err) => {
        return reject(new Error(err.message));
      });

      processus.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Error when trying to execute ${this._jar}`));
        }
        return resolve();
      });
    });
  }

  replaceLibPath(libPath: string): string {
    if (libPath.includes('[')) {
      let lib = Library.resolve(libPath.replace('[', '').replace(']', ''));
      libPath = join(process.env.APP_DIRECTORY, lib.fullPath(), lib.fileName());
    }
    return libPath;
  }
}
