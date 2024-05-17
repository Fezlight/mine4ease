import {
  Account,
  ArgRule,
  ASSETS_PATH,
  INSTANCE_PATH,
  InstanceSettings,
  LIBRARIES_PATH,
  Rule,
  Task,
  Versions,
  VERSIONS_PATH
} from "mine4ease-ipc-api";
import {join} from "path";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig";
import {SEPARATOR} from "./DownloadLibsTask";
import {$authService} from "../services/AuthService";

async function buildCommandLine(instance: InstanceSettings, versionsManifest: Versions) {
  let argLine: string[] = [];
  let versionName = instance.versions.minecraft.name;
  let args = [
    versionsManifest.mainClass
  ];
  let userAccount: Account | undefined = await $authService.getProfile();

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
    args = [versionsManifest.logging.client.argument, ...versionsManifest.arguments.jvm, ...args, ...versionsManifest.arguments.game];
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
    let newValue: string | undefined = undefined;
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
        case "path":
          newValue = process.env.LOGGER_PATH;
          break;
        case "natives_directory":
          newValue = join(process.env.APP_DIRECTORY, VERSIONS_PATH, versionName, "natives");
          break;
        case "library_directory":
          newValue = join(process.env.APP_DIRECTORY, LIBRARIES_PATH);
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
          newValue = join(process.env.APP_DIRECTORY, INSTANCE_PATH, instance.id);
          break;
        case "game_assets":
          newValue = join(process.env.APP_DIRECTORY, ASSETS_PATH, "virtual", "legacy");
          break;
        case "assets_root":
          newValue = join(process.env.APP_DIRECTORY, ASSETS_PATH);
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
          let minecraftJarPath = join(process.env.APP_DIRECTORY, VERSIONS_PATH, versionName, versionName + '.jar');
          newValue = [process.env.CLASSPATH_ARRAY, minecraftJarPath].join('');
          break;
        case "classpath_separator":
          newValue = SEPARATOR;
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

export class LaunchGameTask extends Task {
  private readonly instance: InstanceSettings;
  private readonly versionManifest: Versions;

  constructor(instance: InstanceSettings, versionManifest: Versions) {
    super($eventEmitter, logger, () => "Launching Game ...");
    this.versionManifest = versionManifest;
    this.instance = instance;
  }

  async run(): Promise<void> {
    const cmdLine = await buildCommandLine(this.instance, this.versionManifest);

    const exec = require('child_process');
    logger.debug(cmdLine);

    logger.info(`Launching instance ${this.instance.id} ...`);

    if (!process.env.JAVA_PATH) {
      throw new Error("No java executable was found");
    }
    let javaPath = join(process.env.APP_DIRECTORY, process.env.JAVA_PATH);

    logger.debug(`Java executable path : ${javaPath}`);

    exec.spawn(join(javaPath, $utils.getJavaExecutablePath()), cmdLine, {
      cwd: join(process.env.APP_DIRECTORY, INSTANCE_PATH, this.instance.id),
      detached: true
    });
    // TODO Listen on process exit to reopen launcher
  }
}
