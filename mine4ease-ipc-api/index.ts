import {ApiService, ApiType, curseApiService, feedTheBeastApiService} from "./src/services/ApiService";

export * from './src/services/InstanceService'
export * from './src/services/GlobalSettingService'
export * from './src/services/ApiService'
export * from './src/services/DownloadService'
export * from './src/services/MinecraftService'
export * from './src/services/AuthService'
export * from './src/services/ModService'
export * from './src/providers/CacheProvider'
export * from './src/models/instance/Instance'
export * from './src/models/instance/InstanceSettings'
export * from './src/models/instance/ModSettings'
export * from './src/models/Settings'
export * from './src/models/Manifest'
export * from './src/models/Accounts'
export * from './src/models/Cache'
export * from './src/models/file/ModPack'
export * from './src/models/file/Mod'
export * from './src/models/file/Version'
export * from './src/models/file/Shader'
export * from './src/models/file/Asset'
export * from './src/models/file/Library'
export * from './src/models/file/CachedFile'
export * from './src/models/file/File'
export * from './src/models/file/ResourcePack'
export * from './src/models/file/Java'
export * from './src/models/file/LogConfig'
export * from './src/models/DownloadRequest'
export * from './src/models/ExtractRequest'
export * from './src/models/Rule'
export * from './src/models/modpack/ModPackInfo'
export * from './src/models/modpack/CurseModPack'
export * from './src/models/modpack/ModrinthModPack'
export * from './src/utils/Utils'
export * from './src/task/Task'

export function getByType(type: ApiType): ApiService {
  if(type === ApiType.CURSE) {
    return curseApiService;
  } else if(type === ApiType.FEEDTHEBEAST) {
    return feedTheBeastApiService;
  }
  throw new Error("Not yet implemented");
}
