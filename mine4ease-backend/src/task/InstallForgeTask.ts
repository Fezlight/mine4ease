import {
  CACHE_PATH,
  CachedFile,
  DownloadRequest,
  ExtractRequest,
  InstallSide,
  Library,
  Task,
  TaskRunner,
  Version,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import path from "node:path";
import exec from "child_process";
import {DownloadLibrariesTask, SEPARATOR} from "./DownloadLibsTask.ts";
import {EventEmitter} from "events";
import {ExtractFileTask} from "./FileTask.ts";

export class InstallForgeTask extends Task {
  private readonly _taskRunner: TaskRunner;
  private readonly _minecraftVersion: string;
  private readonly _forgeVersion: string;
  private readonly _forge: Version;
  private readonly _installSide: InstallSide;
  private readonly _subEventEmitter: EventEmitter;

  constructor(minecraftVersion: string, forge: Version, installSide: InstallSide) {
    super($eventEmitter, logger, () => `Installing ${forge.name}...`);
    this._minecraftVersion = minecraftVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
    this._forgeVersion = forge.name.replace('forge-', '');
    this._forge = forge;
    this._installSide = installSide;
  }

  async run(): Promise<void> {
    let forgeVersionPath = path.join(VERSIONS_PATH, `${this._minecraftVersion}-forge-${this._forgeVersion}`);
    let alreadyInstalled = await $utils.isFileExist(path.join(forgeVersionPath, '.installed'));
    if(alreadyInstalled) {
      return Promise.resolve();
    }

    let installerFile = new CachedFile();
    installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}-installer.jar`;

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await $downloadService.download(downloadRequest);

    let extractRequest = new ExtractRequest();
    extractRequest.file = installerFile;
    extractRequest.destPath = forgeVersionPath;
    extractRequest.destName = `${this._minecraftVersion}-forge-${this._forgeVersion}.json`;
    extractRequest.includes = [
      "version.json"
    ];

    // Extract forge version.json
    await $utils.extractFile(extractRequest);

    extractRequest.destName = undefined;
    extractRequest.includes = [
      "install_profile.json"
    ];

    // Extract install_profiles.json
    await $utils.extractFile(extractRequest);

    const installProfile = await $utils.readFile(path.join(extractRequest.destPath, "install_profile.json"))
    .then(JSON.parse);

    this._taskRunner.addTask(new DownloadLibrariesTask(installProfile.libraries, this._minecraftVersion, this._installSide));

    const map = new Map<string, string>;
    const data: Map<string, string> = Object.assign(new Map<string, string>, installProfile.data);
    Object.entries(data).forEach(([key, value]) => {
      map.set(key, value[this._installSide]);
    });

    const processors: [] = installProfile.processors;

    processors.forEach(processor => {
      if (processor.sides && !processor.sides.includes(this._installSide)) {
        return;
      }

      if(processor.args.includes('{BINPATCH}')) {
        extractRequest.destName = `${this._installSide}.lzma`;
        extractRequest.destPath = CACHE_PATH;
        extractRequest.includes = [
          `data/${this._installSide}.lzma`
        ];

        this._taskRunner.addTask(new ExtractFileTask(extractRequest, false));
      }

      this._taskRunner.addTask(new InstallForgeProcessorTask(processor.jar, processor.classpath, processor.args, this._installSide, this._minecraftVersion, map));
    });

    await this._taskRunner.process();

    const fs = require('node:fs');
    fs.writeFile(path.join(process.env.APP_DIRECTORY, forgeVersionPath, '.installed'), '', (err) => {
      if(err) throw Error('Error when writing validation file \'.installed\'');
    });
  }

  onFinished() {
    super.onFinished();
    this._forge.installed = true;
  }
}

export class InstallForgeProcessorTask extends Task {
  private readonly _jar: string;
  private readonly _classpath: string[];
  private readonly _args: string[];
  private readonly _installSide: InstallSide;
  private readonly _mappings: Map<string, string>;
  private readonly _minecraftVersion: string;

  constructor(jar: string, classpath: string[], args: string[], installSide: InstallSide, minecraftVersion: string, mappings: Map<string, string>) {
    super($eventEmitter, logger, () => `Installing forge processor ${jar} ...`);
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
    let javaPath = path.join(process.env.APP_DIRECTORY, process.env.JAVA_PATH);

    let classpath = [];
    for (const lib of this._classpath) {
      let library = Library.resolve(lib);
      classpath.push(path.join(process.env.APP_DIRECTORY, library.fullPath(), library.fileName()))
    }

    let library = Library.resolve(this._jar);
    classpath.push(path.join(process.env.APP_DIRECTORY, library.fullPath(), library.fileName()));

    let mainClass = await $utils.readFileMainClass(path.join(library.fullPath(), library.fileName()));

    let regexIdentifier = /{(\w*)}/;
    for (let i = 0; i < this._args.length; i++) {
      let newValue = null;

      if (RegExp(regexIdentifier).exec(this._args[i])) {
        let argIdentifier;
        do {
          argIdentifier = RegExp(regexIdentifier).exec(this._args[i]);

          if (!argIdentifier) {
            break;
          }

          switch (argIdentifier[1]) {
            case 'MINECRAFT_JAR':
              newValue = path.join(process.env.APP_DIRECTORY, VERSIONS_PATH, this._minecraftVersion, this._minecraftVersion + '.jar');
              break;
            case 'SIDE':
              newValue = this._installSide;
              break;
            case 'BINPATCH':
              let c = new CachedFile();
              c.url = this._mappings.get(argIdentifier[1]) || "";
              newValue = path.join(process.env.APP_DIRECTORY, c.fullPath(), c.fileName());
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

    let cp = classpath.join(SEPARATOR);
    let cmdLine = ["-cp", `${cp}`, mainClass, ...this._args];
    this._log.debug(`Command Line : ${cmdLine}`);

    return new Promise((resolve, reject) => {
      const processus = exec.spawn(path.join(javaPath, "/bin/javaw.exe"), cmdLine, {
        cwd: path.join(process.env.APP_DIRECTORY)
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
    if(libPath.includes('[')) {
      let lib = Library.resolve(libPath.replace('[', '').replace(']', ''));
      libPath = path.join(process.env.APP_DIRECTORY, lib.fullPath(), lib.fileName());
    }
    return libPath;
  }
}
