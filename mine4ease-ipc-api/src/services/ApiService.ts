import {Version} from "../models/file/Version";
import {Mod, ModLoader, ModLoaderCurse} from "../models/file/Mod";
import {Shader} from "../models/file/Shader";
import {ResourcePack} from "../models/file/ResourcePack";

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
   */
  searchMods(filter: string, gameVersion: string, modLoader: ModLoader): Promise<Mod[]>;

  /**
   * Search item by its id can be mod, shaders, etc...
   *
   * @param id mod id
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   */
  searchItemById(id: string, gameVersion: string, modLoader: ModLoader): Promise<Mod | Shader>;

  /**
   * Not yet implemented for first version
   */
  searchShaders(): Promise<Shader[]>;

  /**
   * Not yet implemented for first version
   */
  searchResourcesPacks(): Promise<ResourcePack[]>;

  /**
   * Mapping method to return our domain object
   * @param v api object
   * @param gameVersion minecraft version
   * @param modLoader modloader type (FORGE, FABRIC, etc...)
   */
  toMod(v: any, gameVersion: string, modLoader: ModLoader): Mod
}

const CURSE_FORGE_API_URL = 'https://api.curseforge.com';
const CURSE_FORGE_API_KEY = '$2a$10$idXrFq7MNKIurw71MVrlo.O6g0SO.zwzcQh6Ibslb9WfOLh21VgC.';
const CURSE_FORGE_MINECRAFT_GAME_ID = '432';

export class CurseApiService implements ApiService {
  async searchMods(filter: string, gameVersion: string, modLoader: ModLoader): Promise<Mod[]> {
    const modLoaderCurse = ModLoaderCurse[modLoader.toString() as keyof ModLoaderCurse];

    return fetch(CURSE_FORGE_API_URL + '/v1/mods/search?' + new URLSearchParams({
      gameId: CURSE_FORGE_MINECRAFT_GAME_ID,
      searchFilter: filter,
      gameVersion: gameVersion,
      modLoaderType: modLoaderCurse.toString()
    }), {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then(response => {
      return response.data.map((v: any) => {
        return this.toMod(v, gameVersion, modLoader);
      });
    });
  }

  async searchItemById(id: string, gameVersion: string, modLoader: ModLoader): Promise<Mod | Shader> {
    return fetch(CURSE_FORGE_API_URL + '/v1/mods/' + id, {
      method: 'GET',
      headers: {
        'x-api-key': CURSE_FORGE_API_KEY
      }
    }).then(response => {
      return response.json();
    }).then(response => {
      return this.toMod(response.data, gameVersion, modLoader);
    });
  }

  async searchResourcesPacks(): Promise<ResourcePack[]> {
    throw new Error("Not yet implemented");
  }

  async searchShaders(): Promise<Shader[]> {
    throw new Error("Not yet implemented");
  }

  async searchVersions(gameVersion?: string, modLoader?: ModLoader): Promise<Version[]> {
    if (!gameVersion) {
      return fetch('https://piston-meta.mojang.com/mc/game/version_manifest.json')
      .then(response => {
        return response.json();
      }).then(response => {
        return response.versions.map((v: any) => {
          return {
            name: v.id,
            url: v.url
          }
        });
      });
    } else if (modLoader == ModLoader.FORGE) {
      return fetch(CURSE_FORGE_API_URL + '/v1/minecraft/modloader?version=' + gameVersion)
      .then(response => {
        return response.json();
      }).then(response => {
        return response.data.sort((a: any, b: any) => {
          return Number(new Date(b.dateModified)) - Number(new Date(a.dateModified))
        });
      });
    } else if (modLoader == ModLoader.FABRIC) {
      return fetch('https://meta.fabricmc.net/v2/versions/loader/' + gameVersion)
      .then(response => {
        return this.checkLoaderVersions(modLoader, response.json(), gameVersion);
      });
    } else if (modLoader == ModLoader.QUILT) {
      return fetch('https://meta.quiltmc.org/v3/versions/loader/' + gameVersion)
      .then(response => {
        return this.checkLoaderVersions(modLoader, response.json(), gameVersion);
      });
    }

    return Promise.resolve([]);
  }

  toMod(v: any, gameVersion: string, modLoader: ModLoader): Mod {
    let mod: Mod = new Mod();
    mod.id = v.id;
    mod.name = v.name;
    mod.gameVersion = gameVersion;
    mod.modLoader = modLoader;
    mod.apiType = ApiType.CURSE;
    mod.iconUrl = v.logo.url;
    mod.url = v.latestFiles[0]?.downloadUrl;
    mod.size = v.latestFiles[0]?.fileLength;
    mod.sha1 = v.latestFiles[0]?.hashes[0].value;
    mod.dependencies = v.latestFiles[0]?.dependencies.map(dep => {
      return {
        id: dep.modId,
        relationType: dep.relationType
      };
    })
    return mod;
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