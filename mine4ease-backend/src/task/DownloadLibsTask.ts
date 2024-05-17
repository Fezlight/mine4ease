import {
  DownloadRequest,
  ExtractRequest,
  File,
  InstallSide,
  LegacyForgeLib,
  Libraries,
  Library,
  OS,
  Rule,
  Task,
  TaskRunner,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {join} from "path";
import {arch, platform} from "os";

export const SEPARATOR = process.platform === 'win32' ? ';' : ':';

function addToClassPath(file: File, isAddingToClassPath: boolean) {
  if(!isAddingToClassPath) return;

  if (!process.env.CLASSPATH_ARRAY) {
    process.env.CLASSPATH_ARRAY = "";
  }
  let lib = join(process.env.APP_DIRECTORY, file.fullPath(), file.fileName()) + SEPARATOR;

  if(process.env.CLASSPATH_ARRAY.includes(lib)) {
    return;
  }

  process.env.CLASSPATH_ARRAY += lib;
}

export class DownloadLibrariesTask extends Task {
  private readonly _taskRunner: TaskRunner;
  private readonly _libraries: Libraries[];
  private readonly _minecraftVersion: string;
  private readonly _installSide: InstallSide;
  private readonly _subEventEmitter: EventEmitter;
  private readonly _isAddingToClassPath: boolean;

  constructor(libraries: Libraries[], minecraftVersion: string, installSide: InstallSide,
              isAddingToClassPath: boolean = false, eventEmitter: EventEmitter = $eventEmitter) {
    super(eventEmitter, logger, () => "Checking libraries ...");
    this._subEventEmitter = new EventEmitter();
    this._taskRunner = new TaskRunner(logger, this._subEventEmitter);
    this._libraries = libraries;
    this._minecraftVersion = minecraftVersion;
    this._installSide = installSide;
    this._isAddingToClassPath = isAddingToClassPath;
  }

  async run(): Promise<void> {
    let osArch = arch();
    let osName = Object.keys(OS)[Object.values(OS).indexOf(platform())];

    this._libraries.forEach((lib: Libraries) => {
      let rules: Rule[] = [];
      lib.rules?.forEach(rule => {
        rules.push(Object.assign(new Rule(), rule));
      });
      lib.rules = lib.rules ? rules : undefined;

      let isNatives = lib.name.includes('natives');
      let isLegacyNatives = lib.natives && lib.downloads?.classifiers;

      if (isNatives) {
        let downloadClassifierTask = new DownloadClassifierTask(
          this._subEventEmitter, lib, this._minecraftVersion, osName, osArch, this._installSide, this._isAddingToClassPath
        );
        this._taskRunner.addTask(downloadClassifierTask);
        return;
      }

      if (isLegacyNatives) {
        let downloadClassifierTask = new DownloadClassifierOldWayTask(
          this._subEventEmitter, lib, this._minecraftVersion, osName, osArch, this._installSide, this._isAddingToClassPath
        );
        this._taskRunner.addTask(downloadClassifierTask);
      }

      if (lib.downloads?.artifact) {
        if (lib.downloads?.artifact.url) {
          this._taskRunner.addTask(new DownloadLibTask(this._subEventEmitter, lib, this._installSide, this._isAddingToClassPath));
        } else {
          addToClassPath(Library.resolve(lib.name), this._isAddingToClassPath);
        }
      } else if(!lib.natives) {
        this._taskRunner.addTask(new DownloadLibOldWayTask(this._subEventEmitter, lib, this._installSide, this._isAddingToClassPath));
      }
    });

    await this._taskRunner.process(false);
  }
}

export class DownloadLibOldWayTask extends Task {
  private readonly _lib: Library & LegacyForgeLib;
  private readonly _libUrl: string;
  private readonly _rules: Rule[] | undefined;
  private readonly _installSide: InstallSide;
  private readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking lib ${lib.name}`, true);
    this._lib = Library.resolve(lib.name);
    this._libUrl = lib.url;
    this._rules = lib.rules;
    this._installSide = installSide;
    this._isAddingToClassPath = isAddingToClassPath;
  }

  async run(): Promise<void> {
    let valid = true;

    if(this._lib.clientreq != null || this._lib.serverreq != null) {
      valid = false;
      if(this._lib.clientreq != null && this._installSide === 'client') {
        valid = this._lib.clientreq;
      } else if(this._lib.serverreq != null && this._installSide === 'server') {
        valid = this._lib.serverreq;
      }
    }
    let url = this._libUrl || 'https://libraries.minecraft.net/';
    url += this._lib.subPath?.replaceAll(/\\/g, '/') + '/' + this._lib.fileName();

    this._lib.url = url;

    let downloadReq = new DownloadRequest();
    downloadReq.installSide = this._installSide;
    downloadReq.rules = this._rules;
    downloadReq.file = this._lib;

    if (downloadReq.isRuleValid() && valid) {
      addToClassPath(downloadReq.file, this._isAddingToClassPath);

      await $downloadService.download(downloadReq);
    }
  }
}

export class DownloadLibTask extends Task {
  private readonly lib: Library;
  private readonly rules: Rule[] | undefined;
  private readonly installSide: InstallSide;
  private readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking lib ${lib.name}`, true);
    if (!lib.downloads.artifact) {
      throw new Error(`No library artifact found for lib ${lib.name}`);
    }
    this.lib = Object.assign(new Library(), lib.downloads.artifact);
    this.rules = lib.rules;
    this.installSide = installSide;
    this._isAddingToClassPath = isAddingToClassPath;
  }

  async run(): Promise<void> {
    let downloadReq = new DownloadRequest();
    downloadReq.installSide = this.installSide;
    downloadReq.rules = this.rules;
    downloadReq.file = this.lib;

    if (downloadReq.isRuleValid()) {
      addToClassPath(downloadReq.file, this._isAddingToClassPath);

      await $downloadService.download(downloadReq);
    }
  }
}

export class DownloadClassifierTask extends Task {
  protected readonly lib: Libraries;
  protected readonly minecraftVersion: string;
  protected readonly osName: string;
  protected readonly osArch: string;
  protected readonly installSide: InstallSide;
  protected readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, minecraftVersion: string, osName: string, osArch: string,
              installSide: InstallSide, _isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking classifier ${lib.name}`, true);
    this.lib = lib;
    this.minecraftVersion = minecraftVersion;
    this.osName = osName;
    this.osArch = osArch;
    this.installSide = installSide;
  }

  async run(): Promise<void> {
    let library = Object.assign(new Library(), this.lib.downloads?.artifact);
    let nativesName = `natives-${this.osName}-${this.osArch}`;
    if (this.osArch === 'x64') {
      nativesName = `natives-${this.osName}`;
    }

    if (!library.name.endsWith(nativesName)) {
      return;
    }

    await this.extractNatives(this.lib, library, this.minecraftVersion, this.installSide,
      this._isAddingToClassPath, 10);
  }

  async extractNatives(lib: Libraries, nativeLib: Library, minecraftVersion: string, installSide: InstallSide,
                       isAddingToClassPath: boolean, stripLeadingDirectory: number = 0) {
    let downloadReqClassifier = new DownloadRequest();
    downloadReqClassifier.rules = lib.rules;
    downloadReqClassifier.installSide = installSide;
    downloadReqClassifier.file = Object.assign(new Library(), nativeLib);

    if (downloadReqClassifier.isRuleValid()) {
      addToClassPath(downloadReqClassifier.file, isAddingToClassPath);

      // Extract classifiers
      let extractRequest = new ExtractRequest();
      extractRequest.stripLeadingDirectory = stripLeadingDirectory;
      extractRequest.file = downloadReqClassifier.file;
      extractRequest.destPath = join(VERSIONS_PATH, minecraftVersion, "natives");
      extractRequest.excludes = lib.extract?.excludes ?? [];

      await $downloadService.download(downloadReqClassifier);
      await $utils.extractFile(extractRequest);
    } else {
      logger.info(`Invalid rule for classifier ${lib.name}`);
    }
  }
}

export class DownloadClassifierOldWayTask extends DownloadClassifierTask {
  constructor(eventEmitter: EventEmitter, lib: Libraries, minecraftVersion: string, osName: string, osArch: string,
              installSide: InstallSide, _isAddingToClassPath: boolean = false) {
    super(eventEmitter, lib, minecraftVersion, osName, osArch, installSide, _isAddingToClassPath);
  }

  async run(): Promise<void> {
    let nativeName = this.lib?.natives[this.osName];
    if (nativeName) {
      if (this.osArch === 'x64') {
        nativeName = nativeName.replace("${arch}", '64');
      } else if (['86', '32'].includes(this.osArch)) {
        nativeName = nativeName.replace("${arch}", '32');
      }
    }

    // No classifiers found for os abort process
    if (!nativeName || !this.lib.downloads?.classifiers[nativeName]) {
      logger.warn(`No classifier found for lib=${this.lib.name} and os=${this.osName} and osArch=${this.osArch}`);
      return;
    }

    let nativeLib = this.lib.downloads?.classifiers[nativeName];

    await this.extractNatives(this.lib, nativeLib, this.minecraftVersion, this.installSide, this._isAddingToClassPath);
  }
}
