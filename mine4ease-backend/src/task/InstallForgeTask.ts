import {
  CACHE_PATH,
  CachedFile,
  DownloadRequest,
  ExtractRequest,
  File,
  InstallSide,
  LIBRARIES_PATH,
  Library,
  Task,
  TaskRunner,
  Version,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {join} from "path";
import {spawn} from "child_process";
import {DownloadLibrariesTask, SEPARATOR} from "./DownloadLibsTask";
import {EventEmitter} from "events";
import {DeleteFileTask, ExtractFileTask} from "./FileTask";

export class InstallForgeTask extends Task {
  private readonly _taskRunner: TaskRunner;
  private readonly _minecraftVersion: string;
  private readonly _forgeVersion: string;
  private readonly _installSide: InstallSide;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _versionJsonName: string;

  constructor(minecraftVersion: string, forge: Version, installSide: InstallSide) {
    super($eventEmitter, logger, () => `Installing ${forge.name}...`);
    this._minecraftVersion = minecraftVersion;
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter);
    this._forgeVersion = forge.name.replace('forge-', '');
    this._installSide = installSide;
    this._versionJsonName = `${this._minecraftVersion}-forge-${this._forgeVersion}.json`;
  }

  async run(): Promise<void> {
    let forgeVersionPath = join(VERSIONS_PATH, `${this._minecraftVersion}-forge-${this._forgeVersion}`);
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

      if(installProfile.versionInfo) {
        await this.runLegacyProcess(forgeVersionPath, installerFile, installProfile);
      } else {
        await this.runProcess(forgeVersionPath, installerFile, installProfile);
      }

      this._taskRunner.addTask(new DeleteFileTask(join(installerFile.fullPath(), installerFile.fileName())));
    } else {
      const versionJson = await $utils.readFile(join(forgeVersionPath, this._versionJsonName))
        .then(JSON.parse);

      this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
        this._installSide, true, this._subEventEmitter));
    }

    await this._taskRunner.process();

    const fs = require('node:fs');
    fs.writeFile(join(process.env.APP_DIRECTORY, forgeVersionPath, '.installed'), '', (err: NodeJS.ErrnoException) => {
      if(err) throw Error('Error when writing validation file \'.installed\'');
    });
  }

  async runLegacyProcess(forgeVersionPath: string, installerFile: File, installProfile: any) {
    let file = {
      data: JSON.stringify(installProfile.versionInfo, null, 2),
      path: forgeVersionPath,
      filename: this._versionJsonName
    };

    // Extract forge version.json
    await $utils.saveFile(file);

    let minecraftForgeJar = Library.resolve(installProfile.install.path);
    let extractRequest = new ExtractRequest();
    extractRequest.file = installerFile;
    extractRequest.destPath = minecraftForgeJar.fullPath();
    extractRequest.destName = minecraftForgeJar.fileName();
    extractRequest.includes = [
      installProfile.install.filePath
    ];

    // Extract forge version.json
    await $utils.extractFile(extractRequest);

    let libs = installProfile.versionInfo.libraries.filter((lib: any) => !lib.name.includes(installProfile.install.path));

    this._taskRunner.addTask(new DownloadLibrariesTask(libs, this._minecraftVersion, this._installSide, true, this._subEventEmitter));
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

    extractRequest = new ExtractRequest();
    extractRequest.file = installerFile;
    extractRequest.destPath = LIBRARIES_PATH;
    extractRequest.destNameFilter = "maven/";
    extractRequest.includes = [
      `maven/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}.jar`,
      `maven/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}-universal.jar`
    ];

    // Extract maven folder into libraries
    await $utils.extractFile(extractRequest);

    this._taskRunner.addTask(new DownloadLibrariesTask(versionJson.libraries, this._minecraftVersion,
      this._installSide, true, this._subEventEmitter));

    this._taskRunner.addTask(new DownloadLibrariesTask(installProfile.libraries, this._minecraftVersion,
      this._installSide, false, this._subEventEmitter));

    const map = new Map<string, string>;
    const data: Map<string, string> = Object.assign(new Map<string, string>, installProfile.data);
    Object.entries(data).forEach(([key, value]) => {
      map.set(key, value[this._installSide]);
    });

    const processors: [] = installProfile.processors;

    let needDeleteLZMA = false;
    processors.forEach((processor: any) => {
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
        needDeleteLZMA = true;
      }

      this._taskRunner.addTask(new InstallForgeProcessorTask(processor.jar, processor.classpath, processor.args,
        this._installSide, this._minecraftVersion, map, this._subEventEmitter));
    });

    if (needDeleteLZMA) {
      this._taskRunner.addTask(new DeleteFileTask(join(CACHE_PATH, `${this._installSide}.lzma`)));
    }
  }

  async downloadInstaller(): Promise<File> {
    let installerFile = new CachedFile();
    installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}-installer.jar`;

    const semver = require('semver');
    if(semver.lte(semver.coerce(this._minecraftVersion), '1.6.0')) {
      installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}-universal.zip`;
    }

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await $downloadService.download(downloadRequest);

    return installerFile;
  }
}

export class InstallForgeProcessorTask extends Task {
  private readonly _jar: string;
  private readonly _classpath: string[];
  private readonly _args: string[];
  private readonly _installSide: InstallSide;
  private readonly _mappings: Map<string, string>;
  private readonly _minecraftVersion: string;

  constructor(jar: string, classpath: string[], args: string[], installSide: InstallSide, minecraftVersion: string, mappings: Map<string, string>, eventEmitter: EventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => `Installing forge processor ${jar} ...`);
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

    if(!mainClass) {
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
    if(libPath.includes('[')) {
      let lib = Library.resolve(libPath.replace('[', '').replace(']', ''));
      libPath = join(process.env.APP_DIRECTORY, lib.fullPath(), lib.fileName());
    }
    return libPath;
  }
}
