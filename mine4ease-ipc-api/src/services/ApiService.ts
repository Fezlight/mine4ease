import {Version} from "../models/file/Version";
import {Category, Mod, ModLoader, ModLoaderCurse} from "../models/file/Mod";
import {Shader} from "../models/file/Shader";
import {ResourcePack} from "../models/file/ResourcePack";
import {ModPack} from "../models/file/ModPack";

export enum ApiType {
  CURSE = "CURSE", MODRINTH = "MODRINTH"
}

export interface ApiService {
  /**
   * Search all version related to modloader or vanilla minecraft
   * If gameVersion and modLoader are not provided, search all vanilla minecraft version.
   *
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   */
  searchVersions(gameVersion?: string, modLoader?: ModLoader): Promise<Version[]>

  /**
   * Search mod by filter keyword
   * @param filter text to search
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   * @param category categories used to filter result
   */
  searchMods(filter: string, gameVersion: string, modLoader: ModLoader, category?: Category[]): Promise<Mod[]>;

  /**
   * Search mod pack by filter keyword
   * @param filter text to search
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   * @param category categories used to filter result
   */
  searchModPacks(filter: string, gameVersion?: string, modLoader?: ModLoader, category?: Category[]): Promise<ModPack[]>;

  /**
   * Search mod pack by filter keyword
   * @param filter text to search
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   * @param category categories used to filter result
   */
  searchShaders(filter: string, gameVersion: string, modLoader?: ModLoader, category?: Category[]): Promise<Shader[]>;

  /**
   * Search mod pack by filter keyword
   * @param filter text to search
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   * @param category categories used to filter result
   */
  searchResourcesPacks(filter: string, gameVersion: string, modLoader?: ModLoader, category?: Category[]): Promise<ResourcePack[]>;

  /**
   * Search item by its id can be mod, shaders, etc...
   *
   * @param id mod id
   * @param type item type (Mod or ModPack)
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   */
  getItemById<T extends Mod | ModPack>(id: number, type: T, gameVersion: string | undefined, modLoader: ModLoader | undefined): Promise<T>;

  /**
   * Get a file by its identifier with filter by gameVersion, modLoader.
   *
   * @param id file id
   * @param modId mod id
   * @param type item type (Mod or ModPack)
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   */
  getFileById<T extends Mod | ModPack>(id: number | undefined, modId: number, type: T, gameVersion: string, modLoader?: ModLoader): Promise<T[] | T>

  /**
   * Get mod description
   *
   * @param id mod id
   */
  getModDescription(id: number): Promise<string>;

  /**
   * Retrieve all available category to search on
   */
  getAllCategories(): Promise<Category[]>;
}

const CURSE_FORGE_API_URL = 'https://api.curseforge.com';
const CURSE_FORGE_API_KEY = '$2a$10$idXrFq7MNKIurw71MVrlo.O6g0SO.zwzcQh6Ibslb9WfOLh21VgC.';
const CURSE_FORGE_MINECRAFT_GAME_ID = '432';
const CURSE_FORGE_MINECRAFT_MOD_CLASS_ID = '6';
const CURSE_FORGE_MINECRAFT_MODPACK_CLASS_ID = '4471';
const CURSE_FORGE_MINECRAFT_RESOURCEPACKS_CLASS_ID = '12';
const CURSE_FORGE_MINECRAFT_SHADERPACKS_CLASS_ID = '6552';
export const CURSE_FORGE_TEMPLATE_FILE_DOWNLOAD_URL = "https://media.forgecdn.net/files/<file-id-first4>/<file-id-last3>/<fileName>";

export class CurseApiService implements ApiService {
  private static toFile(object: Mod | ModPack, v: any) {
    object._url = v.downloadUrl ?? v.latestFiles?.[0].downloadUrl;
    object.filename = v.fileName;
    object.size = v.fileLength ?? v.latestFiles?.[0].fileLength;
    object.sha1 = v.hashes?.[0]?.value ?? v.latestFiles?.[0].hashes[0]?.value;
    if (object instanceof Mod) {
      object.dependencies = (v.dependencies ?? v.latestFiles?.[0].dependencies).map((dep: any) => {
        return {
          id: dep.modId,
          relationType: dep.relationType,
          apiType: ApiType.CURSE
        };
      });
    }
  }

  async searchMods(filter: string, gameVersion: string, modLoader?: ModLoader, category?: Category[]): Promise<Mod[]> {
    return this.searchItem(filter, CURSE_FORGE_MINECRAFT_MOD_CLASS_ID,
      this.toMod, gameVersion, modLoader, category);
  }

  async searchModPacks(filter: string, gameVersion?: string, modLoader?: ModLoader, category?: Category[]): Promise<ModPack[]> {
    return this.searchItem(filter, CURSE_FORGE_MINECRAFT_MODPACK_CLASS_ID,
      this.toModPack, gameVersion, modLoader, category);
  }

  async searchResourcesPacks(filter: string, gameVersion: string, modLoader?: ModLoader, category?: Category[]): Promise<ResourcePack[]> {
    return this.searchItem(filter, CURSE_FORGE_MINECRAFT_RESOURCEPACKS_CLASS_ID,
      () => {
      }, gameVersion, modLoader, category);
  }

  async searchShaders(filter: string, gameVersion: string, modLoader?: ModLoader, category?: Category[]): Promise<Shader[]> {
    return this.searchItem(filter, CURSE_FORGE_MINECRAFT_SHADERPACKS_CLASS_ID,
      () => {
      }, gameVersion, modLoader, category);
  }

  async getFileById<T extends Mod | ModPack>(id: number | undefined, modId: number, type: T, gameVersion: string, modLoader?: ModLoader): Promise<T[] | T> {
    let modLoaderCurse = this.getModLoaderCurse(modLoader);
    let func: Function = this.getMappingFunction(type);

    let returnFunction: Promise<Response>;
    if (id) {
      returnFunction = fetch(CURSE_FORGE_API_URL + `/v1/mods/${modId}/files/${id}`, {
        method: 'GET',
        headers: {
          'x-api-key': CURSE_FORGE_API_KEY
        }
      });
    } else {
      returnFunction = fetch(CURSE_FORGE_API_URL + `/v1/mods/${modId}/files?` + new URLSearchParams({
        gameVersion: gameVersion,
        modLoaderType: modLoaderCurse
      }), {
        method: 'GET',
        headers: {
          'x-api-key': CURSE_FORGE_API_KEY
        }
      });
    }

    return returnFunction.then(response => {
      return response.json();
    }).then((response: any) => {
      let res = response.data;
      if (Array.isArray(res)) {
        return res.map((v: any) => {
          return func(v, gameVersion, modLoader);
        });
      }
      return func(res, gameVersion, modLoader);
    });
  }

  async getItemById<T extends Mod | ModPack>(id: number, type: T, gameVersion: string | undefined, modLoader: ModLoader | undefined): Promise<T> {
    let func: Function = this.getMappingFunction(type);
    return fetch(CURSE_FORGE_API_URL + '/v1/mods/' + id, {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then((response: any) => {
      return func(response.data, gameVersion, modLoader!);
    });
  }

  async getModDescription(id: number): Promise<string> {
    return fetch(CURSE_FORGE_API_URL + `/v1/mods/${id}/description`, {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then((response: any) => {
      return response.data;
    });
  }

  async getAllCategories(): Promise<Category[]> {
    return fetch(CURSE_FORGE_API_URL + '/v1/categories/?' + new URLSearchParams({
      gameId: CURSE_FORGE_MINECRAFT_GAME_ID,
      classId: CURSE_FORGE_MINECRAFT_MOD_CLASS_ID
    }), {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then((response: any) => {
      return response.data;
    });
  }

  async searchVersions(gameVersion?: string, modLoader?: ModLoader): Promise<Version[]> {
    if (!gameVersion) {
      return fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
      .then(response => {
        return response.json();
      }).then((response: any) => {
        return response.versions.map((v: any) => {
          return {
            name: v.id,
            url: v.url
          }
        });
      });
    } else if (modLoader === ModLoader.FORGE) {
      return fetch(CURSE_FORGE_API_URL + '/v1/minecraft/modloader?version=' + gameVersion)
      .then(response => {
        return response.json();
      }).then((response: any) => {
        return response.data.sort((a: any, b: any) => {
          return Number(new Date(b.dateModified)) - Number(new Date(a.dateModified))
        });
      });
    } else if (modLoader === ModLoader.FABRIC) {
      return fetch('https://meta.fabricmc.net/v2/versions/loader/' + gameVersion)
      .then(response => {
        return this.checkLoaderVersions(modLoader, response.json(), gameVersion);
      });
    } else if (modLoader === ModLoader.QUILT) {
      return fetch('https://meta.quiltmc.org/v3/versions/loader/' + gameVersion)
      .then(response => {
        return this.checkLoaderVersions(modLoader, response.json(), gameVersion);
      });
    }

    return Promise.resolve([]);
  }

  private async searchItem(filter: string, classId: string, mapper: Function, gameVersion?: string,
                           modLoader?: ModLoader, category?: Category[]) {
    let modLoaderCurse = this.getModLoaderCurse(modLoader);

    return fetch(CURSE_FORGE_API_URL + '/v1/mods/search?' + new URLSearchParams({
      gameId: CURSE_FORGE_MINECRAFT_GAME_ID,
      classId: classId,
      searchFilter: filter,
      gameVersion: gameVersion,
      modLoaderType: modLoaderCurse,
      categoryIds: JSON.stringify(category?.map(cat => cat.id)),
      sortOrder: 'desc',
      sortField: '2'
    }), {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then((response: any) => {
      return response.data.map((v: any) => {
        return mapper(v, gameVersion, modLoader);
      });
    });
  }

  private toMod(v: any, gameVersion: string | undefined, modLoader: ModLoader): Mod {
    let mod = new Mod();
    mod.id = v.modId ?? v.id;
    if (v.modId) {
      mod.installedFileId = v.id;
      mod.installedFileDate = new Date(v.fileDate);
    }
    mod.displayName = v.name;
    mod.gameVersion = gameVersion;
    mod.modLoader = modLoader;
    mod.apiType = ApiType.CURSE;
    mod.summary = v.summary;
    mod.iconUrl = v.logo?.url;
    mod.authors = v.authors;
    mod.categories = v.categories;
    mod.links = v.links;
    mod.downloadCount = v.downloadCount;
    CurseApiService.toFile(mod, v);
    return mod;
  }

  private toModPack(v: any, gameVersion: string | undefined, modLoader: ModLoader): ModPack {
    let modPack = new ModPack();
    modPack.id = v.id;
    if (v.modId) {
      modPack.installedFileId = v.id;
      modPack.installedFileDate = new Date(v.fileDate);
    }
    modPack.displayName = v.name;
    modPack.gameVersion = gameVersion;
    modPack.modLoader = modLoader;
    modPack.apiType = ApiType.CURSE;
    modPack.summary = v.summary;
    modPack.iconUrl = v.logo?.url;
    modPack.authors = v.authors;
    modPack.categories = v.categories;
    modPack.links = v.links;
    modPack.downloadCount = v.downloadCount;
    CurseApiService.toFile(modPack, v);
    return modPack;
  }

  private getMappingFunction<T extends Mod | ModPack>(type: T): Function {
    let func: Function;
    if (type instanceof Mod) {
      func = this.toMod;
    } else if (type instanceof ModPack) {
      func = this.toModPack;
    } else {
      throw new Error("Not yet implemented");
    }
    return func;
  }

  private getModLoaderCurse(modLoader: ModLoader): string | undefined {
    let modLoaderCurse: string;
    if (modLoader) {
      modLoaderCurse = String(ModLoaderCurse[modLoader.toString() as keyof ModLoaderCurse]);
    }
    return modLoaderCurse;
  }

  private async checkLoaderVersions(modLoader: ModLoader, promise: Promise<any>, gameVersion: string): Promise<Version[]> {
    return promise.then(response => {
      if (response.length == 0) {
        throw new Error(`No versions found for ${modLoader} in ${gameVersion}`);
      }
      return response.map((v: any) => {
        return {
          name: v.loader.version
        }
      });
    })
  }
}

export const curseApiService = new CurseApiService();
