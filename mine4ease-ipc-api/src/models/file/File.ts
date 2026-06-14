import {InstallSide} from "../Rule";

export interface FileControl {
  mainPath(): string;
  filePath(): string;
  fileName(): string;
}

export abstract class File implements FileControl {
  _url: string;
  sha1?: string;
  currentHash?: string;
  size?: number;
  totalSize?: number;
  filename: string;
  _name: string;
  _extension: string;
  relativePath?: string;
  subPath?: string;
  installSide?: InstallSide;
  content?: ArrayBuffer;

  filePath(): string {
    if(this.subPath) {
      return this.mainPath() + "/" + this.subPath;
    }
    return this.mainPath();
  }

  abstract mainPath(): string;

  set url(url: string) {
    if(url) {
      let fileName = url.split('/').pop() || "";
      let dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        this.name = fileName.substring(0, dotIndex);
        this.extension = fileName.substring(dotIndex);
      } else {
        this.name = fileName;
        this.extension = "";
      }
    }
    this._url = url;
  }

  get url() {
    return this._url;
  }

  set name(name: string) {
    this._name = decodeURIComponent(name);
  }

  get name() {
    return this._name;
  }

  set extension(ext: string) {
    if(ext && !ext.includes('.')) {
      ext = '.'.concat(ext);
    }
    this._extension = ext;
  }

  get extension() {
    return this._extension;
  }

  fullPath(): string {
    if(this.relativePath) {
      return this.relativePath + "/" + this.filePath();
    }
    return this.filePath();
  }

  fileName(): string {
    return this._name + (this.extension ?? "");
  }

  isHashInvalid(): boolean {
    return !this.currentHash || this.currentHash !== this.sha1;
  }
}
