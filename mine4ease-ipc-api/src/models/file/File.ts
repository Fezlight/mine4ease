import {InstallSide} from "../Rule";

export interface FileControl {
  mainPath(): string;
  filePath?(): string;
  fileName?(): string;
}

export abstract class File implements FileControl {
  _url: string;
  sha1?: string;
  currentHash?: string;
  size?: number;
  totalSize?: number;
  _name: string;
  extension: string;
  isRelativePath?: boolean;
  relativePath?: string;
  subPath?: string;
  installSide?: InstallSide;

  filePath?(): string {
    if(this.subPath) {
      const path = require('node:path');
      return path.join(this.mainPath(), this.subPath);
    }
    return this.mainPath();
  }

  abstract mainPath(): string;

  set url(url: string) {
    if(url) {
      const path = require("node:path");
      let parsedPath = path.parse(url);
      this.name = parsedPath.name;
      this.extension = parsedPath.ext;
    }
    this._url = url;
  }

  get url() {
    return this._url;
  }

  set name(name: string) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  fullPath?(): string {
    if(this.isRelativePath) {
      const path = require('node:path');
      return path.join(this.relativePath, this.filePath());
    }
    return this.filePath();
  }

  fileName?(): string {
    return this._name + (this.extension ?? "");
  }

  isHashInvalid?(): boolean {
    return !this.currentHash || this.currentHash !== this.sha1;
  }
}