import {
  Account,
  ADD_TASK_EVENT_NAME,
  ArgRule,
  Asset,
  Assets,
  ASSETS_PATH,
  CurseApiService,
  DownloadRequest,
  DownloadService,
  IMinecraftService,
  InstanceSettings,
  Libraries,
  LIBRARIES_PATH,
  Rule,
  Utils,
  Version,
  Versions,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {INSTANCE_PATH} from "./InstanceService";
import {Logger} from "winston";
import {AuthService} from "./AuthService";
import {CachedFile} from "mine4ease-ipc-api/src/models/file/CachedFile";
import exec from "child_process";
import path from "node:path";
import {$eventEmitter} from "../config/ObjectFactoryConfig";
import {DownloadFileTask} from "../task/FileTask.ts";
import {DownloadAssetsTask} from "../task/DownloadAssetsTask.ts";
import {DownloadLibrariesTask} from "../task/DownloadLibsTask.ts";
import {DownloadJavaTask} from "../task/DownloadJavaTask.ts";

export class MinecraftService implements IMinecraftService {
  private authService: AuthService;
  private downloadService: DownloadService;
  private utils: Utils;
  private logger: Logger;
  private apiService: CurseApiService;

  constructor(authService: AuthService, downloadService: DownloadService, apiService: CurseApiService,
              utils: Utils, logger: Logger) {
    this.authService = authService;
    this.downloadService = downloadService;
    this.utils = utils;
    this.logger = logger;
    this.apiService = apiService;
  }

  async installForge(forgeVersion: string, minecraftVersion: string) {
    forgeVersion = forgeVersion.replace('forge-', '');

    return;

    // FIXME

    let installerFile = new CachedFile();
    installerFile.url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${forgeVersion}/forge-${minecraftVersion}-${forgeVersion}-installer.jar`;

    let downloadRequest = new DownloadRequest();
    downloadRequest.file = installerFile;

    await this.downloadService.download(downloadRequest);

    let argLine: string[] = [
      "-jar",
      path.join(process.env.APP_DIRECTORY, installerFile.fullPath(), installerFile.fileName())
    ];

    // TODO Replace with java runtime downloaded
    const processus = exec.spawn("C:\\Program Files\\Java\\jdk-17\\bin\\java.exe", argLine, {
      cwd: process.env.APP_DIRECTORY,
      detached: true
    });

    processus.stdout.on('data', (data: Buffer) => {
      console.log(data.toString());
    });

    processus.stderr.on('data', (data: Buffer) => {
      console.error(data.toString());
    });
  }

  // TODO Rework when forge downloading work
  async downloadVersionManifest(instanceSettings: InstanceSettings): Promise<(Versions | Assets)[]> {
    const manifestFile: Version = Object.assign(new Version(), instanceSettings.versions.minecraft);

    let versionsManifest: Promise<Versions | Assets>[] = [];
    versionsManifest.push(this.downloadManifest(manifestFile));

    if (instanceSettings.versions.forge) {
      let version = Object.assign(new Version(), instanceSettings.versions.forge);
      let manifest = await this.apiService.searchModLoaderManifest(version.name);
      version.content = new TextEncoder().encode(JSON.stringify(manifest));
      version.name = `${manifestFile.name}-${version.name}`;
      version.extension = ".json";

      versionsManifest.push(this.downloadManifest(version));
    } else if (instanceSettings.versions.fabric) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.fabric)));
    } else if (instanceSettings.versions.quilt) {
      versionsManifest.push(this.downloadManifest(Object.assign(new Version(), instanceSettings.versions.quilt)));
    }

    return Promise.all(versionsManifest);
  }

  async downloadManifest(manifestFile: Version | Asset): Promise<Versions | Assets> {
    let downloadRequest: DownloadRequest = new DownloadRequest();
    downloadRequest.file = manifestFile;

    this.logger.info(`Retrieving manifest '${downloadRequest.file.fileName()}' ...`);
    return this.downloadService.download(downloadRequest)
    .then(() => this.utils.readFile(path.join(downloadRequest.file.fullPath(), downloadRequest.file.fileName())))
    .then(JSON.parse);
  }

  // TODO REWORK to be more flexible on the merge of each manifest
  async beforeLaunch(instance: InstanceSettings): Promise<Versions> {
    let minecraftVersion = instance.versions.minecraft.name;

    // Read & download manifest version file
    let versions: Versions[] = await this.downloadVersionManifest(instance)
    .catch(err => this.logger.error("Error when trying to retrieve manifest file", err));
    // TODO Throw a dedicated launch exception

    if (instance.modLoader === 'Forge' && instance.versions.forge) {
      await this.installForge(instance.versions.forge.name, minecraftVersion);
    }

    if (instance.installSide === 'client') {
      let client = Object.assign(new Version(), versions[0].downloads.client);
      client.name = versions[0].id;

      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadFileTask(downloadReq));
    }

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadAssetsTask(versions[0]));

    const libsToDownloads: Libraries[] = [];
    versions.forEach(version => {
      libsToDownloads.push(...version.libraries);
    })

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadLibrariesTask(libsToDownloads, minecraftVersion, instance.installSide));

    $eventEmitter.emit(ADD_TASK_EVENT_NAME, new DownloadJavaTask(versions[0].javaVersion.component));

    return;

    // Accumulate args / main class of different manifest
    let newVersionManifest = versions[0];
    versions.forEach(version => {
      if (versions[0] === version) return;

      newVersionManifest.mainClass = version.mainClass;
      if (version.minecraftArguments) {
        if (!newVersionManifest.minecraftArguments) {
          newVersionManifest.minecraftArguments = '';
        }
        newVersionManifest.minecraftArguments += version.minecraftArguments ?? '';
      }
      newVersionManifest.arguments.jvm.push(...version.arguments.jvm);
      newVersionManifest.arguments.game.push(...version.arguments.game);
    })

    return Promise.resolve(newVersionManifest);
  }

  async launchGame(instance: InstanceSettings): Promise<void> {
    this.logger.info(`Launching instance ${instance.id} ...`);
    const exec = require('child_process');

    return this.beforeLaunch(instance)
    /*.then(versions => this.buildCommandLine(instance, versions))
    .then(argLine => {
      this.logger.info(argLine);

      // TODO Change path to java executable to a java download directory by os arch
      const processus = exec.spawn("C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe", argLine, {
        cwd: path.join(process.env.APP_DIRECTORY, INSTANCE_PATH, instance.id),
        detached: true
      });

      processus.stdout.on('data', (data: Buffer) => {
        console.log(data.toString());
      });

      processus.stderr.on('data', (data: Buffer) => {
        console.error(data.toString());
      });
    });*/
  }

  private async buildCommandLine(instance: InstanceSettings, versionsManifest: Versions): Promise<string[]> {
    let argLine: string[] = [];
    let versionName = instance.versions.minecraft.name;
    let args = [
      versionsManifest.mainClass
    ];
    let userAccount: Account | undefined = await this.authService.getProfile();

    if (!userAccount) {
      throw new Error("User account cannot be validated by auth server");
    }

    let defaultJvmArg = [
      "-Djava.library.path=${natives_directory}",
      "-Djna.tmpdir=${natives_directory}",
      "-Dminecraft.launcher.brand=${launcher_name}",
      "-Dminecraft.launcher.version=${launcher_version}",
      "-cp",
      "${classpath}",
    ]

    if (!versionsManifest.arguments) {
      args = [...defaultJvmArg, ...args, ...versionsManifest.minecraftArguments.split(' ')];
    } else {
      args = [...versionsManifest.arguments.jvm, ...args, ...versionsManifest.arguments.game];
    }

    args.forEach(arg => {
      if (typeof (arg) === 'object') {
        let a: ArgRule = Object.assign(new ArgRule(), arg);

        if (!a?.rules) {
          return;
        }

        let rules = [...a.rules];
        a.rules = [];
        rules.forEach(rule => {
          a.rules?.push(Object.assign(new Rule(), rule));
        })

        if (!a.isRuleValid()) {
          return;
        }

        if (typeof a.value === 'string') {
          argLine.push(a.value);
        } else {
          argLine.push(...a.value);
        }
      } else {
        argLine.push(arg);
      }
    })

    let regexIdentifier = /\${(\w*)}/;
    for (let i = 0; i < argLine.length; i++) {
      let newValue = null;
      if (!RegExp(regexIdentifier).exec(argLine[i])) {
        continue;
      }

      let argIdentifier;
      do {
        argIdentifier = RegExp(regexIdentifier).exec(argLine[i]);

        if (!argIdentifier) {
          break;
        }

        switch (argIdentifier[1]) {
          case "natives_directory":
            newValue = path.join(process.env.APP_DIRECTORY, VERSIONS_PATH, versionName, "natives");
            break;
          case "library_directory":
            newValue = path.join(process.env.APP_DIRECTORY, LIBRARIES_PATH);
            break;
          case "launcher_name":
            newValue = "Mine4Ease";
            break;
          case "launcher_version":
            newValue = String(versionsManifest.minimumLauncherVersion);
            break;
          case "auth_player_name":
            newValue = userAccount.username;
            break;
          case "version_name":
            newValue = instance.versions.minecraft.name;
            break;
          case "game_directory":
            newValue = path.join(process.env.APP_DIRECTORY, INSTANCE_PATH, instance.id);
            break;
          case "game_assets":
            newValue = path.join(process.env.APP_DIRECTORY, ASSETS_PATH, "virtual", "legacy");
            break;
          case "assets_root":
            newValue = path.join(process.env.APP_DIRECTORY, ASSETS_PATH);
            break;
          case "assets_index_name":
            newValue = versionsManifest.assets;
            break;
          case "auth_uuid":
            newValue = userAccount.uuid;
            break;
          case "auth_access_token":
            newValue = userAccount.accessToken;
            break;
          case "user_type":
            newValue = "msa";
            break;
          case "version_type":
            newValue = versionsManifest.type;
            break;
          case "user_properties":
            newValue = "{}";
            break;
          case "classpath":
            let minecraftJarPath = path.join(process.env.APP_DIRECTORY, VERSIONS_PATH, versionName, versionName + '.jar');
            newValue = [process.env.CLASSPATH, minecraftJarPath].join(process.platform === 'win32' ? ';' : ':');
            break;
          case "classpath_separator":
            newValue = process.platform === 'win32' ? ';' : ':';
            break;
        }

        if (newValue != null) {
          argLine[i] = argLine[i].replace(regexIdentifier, newValue);
        } else {
          break;
        }
      } while (argIdentifier);
    }

    return Promise.resolve(argLine);
  }
}
