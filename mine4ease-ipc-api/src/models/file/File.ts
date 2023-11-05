export interface FileControl {
  mainPath(): string;
  filePath?(): string;
}

export abstract class File implements FileControl {
  url: string;
  hash: string;
  currentHash?: string;
  size: number;
  totalSize?: number;
  name: string;
  path?: string;

  filePath?(): string {
    return this.mainPath();
  }

  abstract mainPath(): string;

  isHashInvalid?(): boolean {
    return !this.currentHash || this.currentHash !== this.hash;
  }
}
