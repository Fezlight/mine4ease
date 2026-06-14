import {Logger} from "winston";
import {ExtractRequest} from "../models/ExtractRequest";
import JSZip from "jszip";

// Global Node.js modules will be set by the environment (backend)
declare global {
  var nodeFs: any;
  var nodePath: any;
  var nodeCrypto: any;
  var nodeOs: any;
  var nodeDecompress: any;
}

export interface IUtils {
  readFile(filePath: string, relative?: boolean, binary?: boolean): Promise<any>;

  saveFile(file: { data: any, path?: string, filename: string, binary?: boolean }): Promise<string>;

  deleteFile(filePath: string): Promise<string>;

  readFileHash(filePath: string): Promise<string>;

  extractFile(extractRequest: ExtractRequest): Promise<void>;

  getPlatform(): { OS: string; platform: string };
}

export class Utils implements IUtils {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  static getBrowserPlatform(): { OS: string; platform: string } {
    const userAgent = navigator.userAgent.toLowerCase();
    let OS = "linux";
    let platform = "x64";

    if (userAgent.indexOf("win") !== -1) OS = "windows";
    else if (userAgent.indexOf("mac") !== -1) OS = "mac-os";

    if (userAgent.indexOf("arm") !== -1 || userAgent.indexOf("aarch64") !== -1) platform = "arm64";

    return { OS, platform };
  }

  saveFile(file: { data: any, path?: string, filename: string, binary?: boolean, mode?: number }): Promise<string> {
    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }
    if (typeof nodePath !== 'undefined') {
      directory = nodePath.join(directory, file.path ?? "");
    } else {
      directory = directory + "/" + (file.path ?? "");
    }

    if (typeof nodeFs !== 'undefined' && !nodeFs.existsSync(directory)) {
      nodeFs.mkdirSync(directory, {recursive: true});
    }
    
    let fullPath = directory + "/" + file.filename;
    if (typeof nodePath !== 'undefined') {
       fullPath = nodePath.join(directory, file.filename);
    }

    if (typeof nodeFs === 'undefined') {
      return Promise.reject(new Error("Node.js fs module not available"));
    }

    this.logger?.debug(`Saving file ${file.filename} into ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(file.data);

      const stream = nodeFs.createWriteStream(fullPath, {
        encoding: file.binary ? 'binary' : 'utf-8',
        mode: file.mode
      });

      stream.write(buffer, (err) => {
        if (err) {
          this.logger?.error("Error writing to file", err)
          return reject(err);
        } else {
          this.logger?.debug("Writing to file : " + fullPath)
          stream.end();
          return resolve("");
        }
      });

      stream.on('error', reject);
    })
  }

  readFile(filePath: string, relative: boolean = true, binary: boolean = false): Promise<any> {
    let fullPath = filePath;
    if (relative) {
      let directory = process.env.APP_DIRECTORY;
      if (!directory) {
        throw new Error("Unable to retrieve main directory");
      }

      if (typeof nodePath !== 'undefined') {
        fullPath = nodePath.join(directory, filePath);
      } else {
        fullPath = directory + "/" + filePath;
      }
    }

    if (typeof nodeFs === 'undefined') {
      return Promise.reject(new Error("Node.js fs module not available"));
    }

    this.logger?.debug(`Reading file from ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      nodeFs.access(fullPath, nodeFs.constants.F_OK, (err: any) => {
        if (err) {
          let error = new Error("File does not exist : " + fullPath);
          error.name = "FILE_NOT_FOUND";
          return reject(error);
        }

        const stream = nodeFs.createReadStream(fullPath, {
          highWaterMark: binary ? 64 * 1024 : undefined,
          encoding: binary ? 'binary' : 'utf-8',
        });

        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => {
          // Ensure the chunk is treated as binary data
          if (binary) {
            if (typeof chunk === 'string') {
              chunk = Buffer.from(chunk, 'binary');
            }
            chunks.push(chunk);
          } else {
            chunks.push(chunk);
          }
        });

        stream.on('end', () => {
          if (binary) {
            return resolve(new Uint8Array(Buffer.concat(chunks)).buffer);
          } else {
            return resolve(chunks.join(''))
          }
        });

        stream.on('error', reject);
      })
    })
  }

  deleteFile(filePath: string): Promise<string> {
    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    let fullPath = directory + "/" + filePath;
    if (typeof nodePath !== 'undefined') {
      fullPath = nodePath.join(directory, filePath);
    }

    if (typeof nodeFs === 'undefined') {
      return Promise.reject(new Error("Node.js fs module not available"));
    }

    this.logger.info(`Deleting file from ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      nodeFs.access(fullPath, nodeFs.constants.F_OK, (err: any) => {
        if (err) {
          let error = new Error("File does not exist : " + fullPath);
          error.name = "FILE_NOT_FOUND";
          return reject(error);
        }

        nodeFs.rmSync(fullPath, {recursive: true, force: true});

        return resolve("");
      })
    })
  }

  async readFileHash(filePath: string): Promise<string> {
    this.logger.debug(`Reading file hash : ${filePath} ...`);
    return this.readFile(filePath, true, true)
    .then((data: ArrayBuffer) => {
      if (typeof nodeCrypto === 'undefined') {
        throw new Error("Node.js crypto module not available");
      }
      return nodeCrypto.createHash('sha1')
      .update(Buffer.from(data))
      .digest('hex');
    })
    .catch(err => {
      this.logger.error(err.message)
      return "";
    });
  }

  async readFileMainClass(filePath: string): Promise<string | undefined> {
    this.logger.debug(`Reading file main class : ${filePath} ...`);

    let zip = new JSZip();
    return this.readFile(filePath, true, true)
    .then(async (data: ArrayBuffer) => {
      await zip.loadAsync(data);
      return zip.file("META-INF/MANIFEST.MF")?.async("string");
    }).then(str => {
      return str?.split('\n')
      .map(line => line.split(': '))
      .find(arr => arr[0] === 'Main-Class')?.[1]
      .trim();
    });
  }

  async isFileExist(filePath: string): Promise<boolean> {
    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    let fullPath = directory + "/" + filePath;
    if (typeof nodePath !== 'undefined') {
      fullPath = nodePath.join(directory, filePath);
    }

    if (typeof nodeFs === 'undefined') {
      return Promise.resolve(false);
    }

    this.logger.debug(`Checking if file exist : ${filePath} ...`);
    return new Promise((resolve) => {
      nodeFs.access(fullPath, nodeFs.constants.F_OK, (err: any) => {
        if (err) {
          resolve(false);
        }

        resolve(true);
      })
    })
  }

  async extractFile(extractRequest: ExtractRequest): Promise<void> {
    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    if (!extractRequest?.file) {
      throw new Error("Unable to retrieve file to extract");
    }

    let fullPath = directory + "/" + extractRequest.file.filePath() + "/" + extractRequest.file.fileName();
    let destFullPath = directory + "/" + extractRequest.destPath;
    if (typeof nodePath !== 'undefined') {
      fullPath = nodePath.join(directory, extractRequest.file.filePath(), extractRequest.file.fileName());
      destFullPath = nodePath.join(directory, extractRequest.destPath);
    }
    let excludes = extractRequest.excludes;
    let includes = extractRequest.includes;

    if (typeof nodeDecompress === 'undefined') {
      return Promise.reject(new Error("Node.js decompress module not available"));
    }

    return nodeDecompress(fullPath, destFullPath, {
      filter: file => {
        let valid = true;
        if (includes) {
          let tempValid = false;
          for (let inc of includes) {
            if (file.path.indexOf(inc) > -1) {
              tempValid = true;
              break;
            }
          }
          valid &&= tempValid;
        }

        if (excludes) {
          for (let excl of excludes) {
            if (file.path.indexOf(excl) > -1) {
              valid &&= false;
              break;
            }
          }
        }

        return valid;
      },
      map: file => {
        if (extractRequest.destName) {
          file.path = extractRequest.destName;
        }
        if (extractRequest.destNameFilter) {
          file.path = file.path.replace(extractRequest.destNameFilter, '');
        }
        return file;
      },
      strip: extractRequest.stripLeadingDirectory
    });
  }

  getPlatform(): { OS: string; platform: string } {
    if (typeof nodeOs === 'undefined') {
      return Utils.getBrowserPlatform();
    }
    let platform = nodeOs.machine();
    if (platform === 'x86_64') {
      platform = nodeOs.arch() !== 'x64' ? 'x86' : 'x64';
    }

    let OS = nodeOs.type()
    if (OS === 'Linux') {
      OS = "linux";
    } else if (OS === 'Darwin') {
      OS = "mac-os";
    } else if (OS === 'Windows_NT') {
      OS = "windows";
    } else {
      throw new Error(`Unknown OS : ${OS}`);
    }

    return {platform, OS};
  }

  getJavaExecutablePath(): string {
    let os = this.getPlatform().OS;

    if(os === 'windows') {
      return '/bin/java.exe';
    }
    return '/bin/java'
  }
}
