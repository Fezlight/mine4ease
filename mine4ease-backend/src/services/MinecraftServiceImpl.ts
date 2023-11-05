import {
  ArgRule,
  Asset, Assets, ASSETS_PATH,
  DownloadRequest, ExtractRequest,
  File,
  InstanceSettings,
  Libraries,
  Library,
  MINECRAFT_RESSOURCES_URL,
  MinecraftService, OS, Rule,
  Version, Versions, VERSIONS_PATH
} from "mine4ease-ipc-api";
import {$downloadService, $utils, logger} from "../../main";
import path from "node:path";
import * as os from "os";
import {INSTANCE_PATH} from "./InstanceServiceImpl";
import {ChildProcess} from "child_process";

export class MinecraftServiceImpl implements MinecraftService {
  async downloadManifest(manifestFile: File): Promise<Versions | Assets> {
    let downloadRequest: DownloadRequest = new DownloadRequest();
    downloadRequest.file = manifestFile;

    logger.info(`Retrieving manifest '${downloadRequest.file.fileName()}' ...`)
    return $downloadService.download(downloadRequest)
      .then(() => $utils.readFile(path.join(downloadRequest.file.fullPath(), downloadRequest.file.fileName())))
      .then(JSON.parse);
  }

  downloadAssets(assetsFile: Assets): Promise<any> {
    let assets = assetsFile.objects;

    logger.info(`Downloading ${assets.size} assets...`)
    let promises: Promise<any>[] = [];
    assets.forEach((value, key) => {
      value.virtual = assetsFile.virtual;

      let downloadReq = new DownloadRequest();
      downloadReq.file = Object.assign(new Asset(), value);

      let folder = downloadReq.file.sha1.substring(0, 2);
      downloadReq.file.url = MINECRAFT_RESSOURCES_URL + `/${folder}/${downloadReq.file.name}`
      if(assetsFile.virtual) {
        downloadReq.file.subPath = `${downloadReq.file.subPath}/${path.parse(key).dir}`;
        downloadReq.file.name = path.parse(key).name;
        downloadReq.file.extension = path.parse(key).ext;
      } else {
        downloadReq.file.subPath = `${downloadReq.file.subPath}/${folder}`;
      }

      promises.push($downloadService.download(downloadReq));
    });

    return Promise.all(promises);
  }

  async downloadLibraries(instance: InstanceSettings, libraries: Libraries[] = []): Promise<any> {
    logger.info(`Downloading ${libraries.length} libraries...`)

    let promises: Promise<string | void>[] = [];
    let classPath = [];
    libraries.forEach((lib: Libraries) => {
      let downloadReq = new DownloadRequest();
      downloadReq.installSide = instance.installSide;
      lib.rules?.forEach(rule => {
        if(!downloadReq.rules) {
          downloadReq.rules = [];
        }
        downloadReq.rules.push(Object.assign(new Rule(), rule));
      });

      if(lib.downloads.artifact) {
        downloadReq.file = Object.assign(new Library(), lib.downloads.artifact);

        if(downloadReq.isRuleValid()) {
          classPath.push(path.join(process.env.APP_DIRECTORY, downloadReq.file.fullPath(), downloadReq.file.fileName()));
          promises.push($downloadService.download(downloadReq));
        }
      }

      let {rules, installSide} = downloadReq;
      let osName = Object.keys(OS)[Object.values(OS).indexOf(os.platform())];

      if(!lib?.natives) {
        return;
      }

      let nativeName = lib?.natives[osName];
      if(nativeName) {
        let osArch = os.arch();
        if(osArch === 'x64') {
          nativeName = nativeName.replace("${arch}", '64');
        } else if(['86', '32'].includes(osArch)) {
          nativeName = nativeName.replace("${arch}", '32');
        }
      }

      if(lib.downloads?.classifiers && lib.downloads?.classifiers[nativeName]) {
        let nativeLib = lib.downloads?.classifiers[nativeName];
        let downloadReqClassifier = new DownloadRequest();
        downloadReqClassifier.rules = rules;
        downloadReqClassifier.installSide = installSide;
        downloadReqClassifier.file = Object.assign(new Library(), nativeLib);

        if(downloadReqClassifier.isRuleValid()){
          classPath.push(path.join(process.env.APP_DIRECTORY, downloadReqClassifier.file.fullPath(), downloadReqClassifier.file.fileName()));

          // Extract natives
          let extractRequest = new ExtractRequest();
          extractRequest.file = downloadReqClassifier.file;
          extractRequest.destPath = path.join(VERSIONS_PATH, instance.versions.minecraft.name, "natives");
          extractRequest.excludes = lib.extract?.excludes ?? [];

          promises.push($downloadService.download(downloadReqClassifier).finally(() => $utils.extractFile(extractRequest)));
        }
      }
    });

    process.env.CLASSPATH = classPath.join(';');

    return Promise.all(promises);
  }

  async beforeLaunch(instance: InstanceSettings): Promise<Versions> {
    const manifestFile: Version = Object.assign(new Version(), instance.versions.minecraft);

    // Read & download manifest version file
    let versions: Versions = await this.downloadManifest(manifestFile)
      .catch(logger.error);
    // TODO Throw a dedicated launch exception

    if(instance.installSide === 'client') {
      let client = Object.assign(new Version(), versions.downloads.client);
      client.name = instance.versions.minecraft.name;
      let downloadReq = new DownloadRequest();
      downloadReq.file = client;

      await $downloadService.download(downloadReq);
    }

    const assetsFile: Asset = Object.assign(new Asset(), versions.assetIndex);
    assetsFile.subPath = 'indexes';

    // Read & download manifest assets file
    let assets: Assets = await this.downloadManifest(assetsFile)
      .then(assets => Object.assign(new Assets(), assets))
      .catch(err => logger.error("", err));
    // TODO Throw a dedicated launch exception

    // Download Assets
    await this.downloadAssets(assets);

    // Download libs
    await this.downloadLibraries(instance, versions.libraries)
      .catch(err => logger.error("", err));
    // TODO Throw a dedicated launch exception

    return Promise.resolve(versions);
  }

  private buildCommandLine(instance: InstanceSettings, versionsManifest: Versions): Promise<string[]> {
    let argLine: string[] = [];
    let versionName = instance.versions.minecraft.name;
    let args = [
      versionsManifest.mainClass
    ];

    let defaultJvmArg = [
      "-Djava.library.path=${natives_directory}",
      "-Djna.tmpdir=${natives_directory}",
      "-Dminecraft.launcher.brand=${launcher_name}",
      "-Dminecraft.launcher.version=${launcher_version}",
      "-cp",
      "${classpath}",
    ]

    if(!versionsManifest.arguments) {
      args = [...defaultJvmArg, ...args, ...versionsManifest.minecraftArguments.split(' ')];
    } else {
      args = [...versionsManifest.arguments.jvm, ...args, ...versionsManifest.arguments.game];
    }

    args.forEach(arg => {
      if(typeof(arg)  === 'object') {
        let a: ArgRule = Object.assign(new ArgRule(), arg);

        let rules = [...a.rules];
        a.rules = [];
        rules.forEach(rule => {
          a.rules.push(Object.assign(new Rule(), rule));
        })

        if(!a.isRuleValid()) {
          return;
        }

        if(typeof a.value === 'string') {
          argLine.push(a.value);
        } else {
          argLine.push(...a.value);
        }
      } else {
        argLine.push(arg);
      }
    })

    let regexIdentifier = /\${*(.*)}/;
    for (let i = 0; i < argLine.length; i++) {
      let newValue = null;
      if(!argLine[i].match(regexIdentifier)) {
        continue;
      }

      let argIdentifier = argLine[i].match(regexIdentifier);

      switch (argIdentifier[1]) {
        case "natives_directory":
          newValue = path.join(process.env.APP_DIRECTORY, VERSIONS_PATH, versionName, "natives");
          break;
        case "launcher_name":
          newValue = "Mine4Ease";
          break;
        case "launcher_version":
          newValue = String(versionsManifest.minimumLauncherVersion);
          break;
        case "auth_player_name":
          // TODO Replace with username extracted from microsoft auth
          newValue = "FezLight";
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
          // TODO Replace with uuid extracted from microsoft auth
          newValue = "05ff6c9ac53e46ec8a87bcdeedd0d82d";
          break;
        case "auth_access_token":
          // TODO Replace with access token extracted from microsoft auth
          newValue = "eyJraWQiOiJhYzg0YSIsImFsZyI6IkhTMjU2In0.eyJ4dWlkIjoiMjUzMzI3NDk2OTk1MTgzNCIsImFnZyI6IkFkdWx0Iiwic3ViIjoiYWJkYTk1NWYtNzBmZC00ZDJlLWE3ZWItODIxNzNmOTRkNDdiIiwiYXV0aCI6IlhCT1giLCJucyI6ImRlZmF1bHQiLCJyb2xlcyI6W10sImlzcyI6ImF1dGhlbnRpY2F0aW9uIiwiZmxhZ3MiOlsidHdvZmFjdG9yYXV0aCIsIm9yZGVyc18yMDIyIl0sInBsYXRmb3JtIjoiUENfTEFVTkNIRVIiLCJ5dWlkIjoiMjBkMmI3ZGMwM2QzNGMzOWI4NzYwYWEwMWFiZGZhOTMiLCJuYmYiOjE2OTQyNTI4MjYsImV4cCI6MTY5NDMzOTIyNiwiaWF0IjoxNjk0MjUyODI2fQ.khCqFwQvKFt_Xfjyh7--lZw1q8f92PtPCNmHwMnvFBU";
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
      }

      if(newValue != null) {
        argLine[i] = argLine[i].replace(regexIdentifier, newValue);
      }
    }

    return Promise.resolve(argLine);
  }

  async launchGame(instance: InstanceSettings): Promise<ChildProcess> {
    const exec = require('child_process');

    return this.beforeLaunch(instance)
      .then(versions => this.buildCommandLine(instance, versions))
      .then(argLine => {
        logger.info(argLine);

        // TODO Change path to java executable to a java download directory by os arch
        const processus = exec.spawn("C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe", argLine, {
          cwd: path.join(process.env.APP_DIRECTORY, INSTANCE_PATH, instance.id),
          detached: true
        });

        processus.stdout.on('data', (data: Buffer) => {
          logger.info(data.toString());
        });

        processus.stderr.on('data', (data: Buffer) => {
          logger.error(data.toString());
        });

        return processus;
      });
  }
}
