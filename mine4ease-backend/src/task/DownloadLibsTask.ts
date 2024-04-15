import {
  ADD_TASK_EVENT_NAME,
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
import {$eventEmitter, logger} from "../config/ObjectFactoryConfig";
import {EventEmitter} from "events";
import {join} from "path";
import {arch, platform} from "os";
import {DownloadFileTask, ExtractFileTask} from "./FileTask";

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

  constructor(libraries: Libraries[], minecraftVersion: string, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super($eventEmitter, logger, () => "Checking libraries ...");
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

      if (lib.downloads?.artifact) {
        if (lib.downloads?.artifact.url) {
          this._taskRunner.addTask(new DownloadLibTask(this._subEventEmitter, lib, this._installSide, this._isAddingToClassPath));
        } else {
          addToClassPath(Library.resolve(lib.name), this._isAddingToClassPath);
        }
      } else if(!lib.natives) {
        this._taskRunner.addTask(new DownloadLibOldWayTask(this._subEventEmitter, lib, this._installSide, this._isAddingToClassPath));
      }

      if (lib.natives && lib.downloads?.classifiers) {
        let downloadClassifierTask = new DownloadClassifierTask(
          this._subEventEmitter, lib, this._minecraftVersion, osName, osArch, this._installSide, this._isAddingToClassPath
        );
        this._taskRunner.addTask(downloadClassifierTask);
      }
    });

    await this._taskRunner.process();
  }
}

export class DownloadLibOldWayTask extends Task {
  private readonly _lib: Library & LegacyForgeLib;
  private readonly _libUrl: string;
  private readonly _rules: Rule[] | undefined;
  private readonly _installSide: InstallSide;
  private readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking lib ${lib.name}`);
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

      this._eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadFileTask(downloadReq), false);
    }
  }
}

export class DownloadLibTask extends Task {
  private readonly lib: Library;
  private readonly rules: Rule[] | undefined;
  private readonly installSide: InstallSide;
  private readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking lib ${lib.name}`);
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

      this._eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadFileTask(downloadReq), false);
    }
  }
}

export class DownloadClassifierTask extends Task {
  private readonly lib: Libraries;
  private readonly minecraftVersion: string;
  private readonly osName: string;
  private readonly osArch: string;
  private readonly installSide: InstallSide;
  private readonly _isAddingToClassPath: boolean;

  constructor(eventEmitter: EventEmitter, lib: Libraries, minecraftVersion: string, osName: string, osArch: string, installSide: InstallSide, isAddingToClassPath: boolean = false) {
    super(eventEmitter, logger, () => `Checking classifier ${lib.name}`, true);
    this.lib = lib;
    this.minecraftVersion = minecraftVersion;
    this.osName = osName;
    this.osArch = osArch;
    this.installSide = installSide;
    this._isAddingToClassPath = isAddingToClassPath;
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

    let downloadReqClassifier = new DownloadRequest();
    downloadReqClassifier.rules = this.lib.rules;
    downloadReqClassifier.installSide = this.installSide;
    downloadReqClassifier.file = Object.assign(new Library(), nativeLib);

    if (downloadReqClassifier.isRuleValid()) {
      addToClassPath(downloadReqClassifier.file, this._isAddingToClassPath);

      // Extract classifiers
      let extractRequest = new ExtractRequest();
      extractRequest.file = downloadReqClassifier.file;
      extractRequest.destPath = join(VERSIONS_PATH, this.minecraftVersion, "natives");
      extractRequest.excludes = this.lib.extract?.excludes ?? [];

      this._eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadFileTask(downloadReqClassifier), false);
      this._eventEmitter.emit(ADD_TASK_EVENT_NAME, new ExtractFileTask(extractRequest), false);
    }
  }
}
