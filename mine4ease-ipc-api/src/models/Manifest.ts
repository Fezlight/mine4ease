import {File} from "./file/File";
import {Rule} from "./Rule";
import {Library} from "./file/Library";
import {Asset} from "./file/Asset";

export class Versions {
  arguments: {
    game: [],
    jvm: []
  };
  minecraftArguments: string;
  assetIndex: Asset;
  assets: string;
  inheritFrom: string;
  downloads: {
    client: File;
    client_mappings: File;
    server: File;
    server_mappings: File;
  };
  id: string;
  javaVersion: {
    component: string;
    majorVersion: string;
  }
  libraries: Libraries[];
  logging: {
    client: {
      argument: string;
      file: File;
      type: string;
    }
  };
  mainClass: string;
  minimumLauncherVersion: number;
  releaseTime: Date;
  time: Date;
  type: string;
}

export class Libraries {
  downloads: {
    artifact: Library;
    classifiers: { [key: string]: Library };
  };
  url: string;
  name: string;
  rules?: Rule[];
  extract: {
    excludes: string[]
  };
  natives: { [key: string]: string };
}

export class Assets {
  _objects: Map<string, Asset>;
  virtual?: boolean;

  set objects(objects: any[]) {
    this._objects = new Map<string, Asset>(Object.entries(objects));
  }

  get objects(): Map<string, Asset> {
    return this._objects;
  }
}
