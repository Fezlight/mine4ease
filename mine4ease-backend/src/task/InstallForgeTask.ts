import {
  ADD_TASK_EVENT_NAME,
  CachedFile,
  DownloadRequest,
  ExtractRequest,
  InstallSide,
  Library,
  Task
} from "mine4ease-ipc-api";
import {$downloadService, $eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import path from "node:path";
import exec from "child_process";
import {DownloadLibrariesTask, SEPARATOR} from "./DownloadLibsTask.ts";

export class InstallForgeTask extends Task {
  private readonly _minecraftVersion: string;
  private readonly _forgeVersion: string;
  private readonly _installSide: InstallSide;

  constructor(minecraftVersion: string, forgeVersion: string, installSide: InstallSide) {
    super($eventEmitter, logger, () => `Installing forge ${forgeVersion}...`);
    this._minecraftVersion = minecraftVersion;
    this._forgeVersion = forgeVersion.replace('forge-', '');
    this._installSide = installSide;
  }

  async run(): Promise<void> {
    let installerFile = new CachedFile();
    installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${this._minecraftVersion}-${this._forgeVersion}/forge-${this._minecraftVersion}-${this._forgeVersion}-installer.jar`;

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await $downloadService.download(downloadRequest);

    let extractRequest = new ExtractRequest();
    extractRequest.file = installerFile;
    extractRequest.destPath = path.join('versions', `${this._minecraftVersion}-forge-${this._forgeVersion}`);
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

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadLibrariesTask(installProfile.libraries, this._minecraftVersion, this._installSide));

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

      $eventEmitter.emit(ADD_TASK_EVENT_NAME, new InstallForgeProcessorTask(processor.jar, processor.classpath, processor.args, this._installSide, map));
    })

    // TODO Download all libraries from forge

    return Promise.resolve(undefined);
  }
}

export class InstallForgeProcessorTask extends Task {
  private readonly _jar: string;
  private readonly _classpath: string[];
  private readonly _args: string[];
  private readonly _installSide: InstallSide;
  private readonly _mappings: Map<string, string>;

  constructor(jar: string, classpath: string[], args: string[], installSide: InstallSide, mappings: Map<string, string>) {
    super($eventEmitter, logger, () => `Installing forge processor ${jar} ...`);
    this._jar = jar;
    this._classpath = classpath;
    this._args = args;
    this._installSide = installSide;
    this._mappings = mappings;
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

    let regexIdentifier = /{(\w*)}/;
    for (let i = 0; i < this._args.length; i++) {
      let newValue = null;

      if (!RegExp(regexIdentifier).exec(this._args[i])) {
        continue;
      }

      let argIdentifier;
      do {
        argIdentifier = RegExp(regexIdentifier).exec(this._args[i]);

        if (!argIdentifier) {
          break;
        }

        switch (argIdentifier[1]) {
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

    console.log(this._args.join(' '));

    let cp = classpath.join(SEPARATOR);
    let cmdLine = ["-cp", `${cp}`, ...this._args];
    console.debug(cmdLine);

    const processus = exec.spawn(path.join(javaPath, "/bin/javaw.exe"), cmdLine, {
      cwd: path.join(process.env.APP_DIRECTORY)
    });

    processus.stdout.on("data", (data) => {
      this.log.info(data.toString());
    });
    processus.stderr.on("data", (data) => {
      this.log.error(data.toString());
    });
  }
}
