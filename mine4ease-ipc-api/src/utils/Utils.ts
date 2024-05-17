import {Logger} from "winston";
import {ExtractRequest} from "../models/ExtractRequest";
import JSZip from "jszip";

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

  saveFile(file: { data: any, path?: string, filename: string, binary?: boolean }): Promise<string> {
    const path = require("node:path");
    const fs = require("node:fs");

    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }
    directory = path.join(directory, file.path ?? "");

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {recursive: true});
    }
    let fullPath = path.join(directory, file.filename);

    this.logger?.debug(`Saving file ${file.filename} into ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(file.data);

      const stream = fs.createWriteStream(fullPath, {
        encoding: file.binary ? 'binary' : 'utf-8',
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
    const path = require("node:path");
    const fs = require("node:fs");

    let fullPath = filePath;
    if (relative) {
      let directory = process.env.APP_DIRECTORY;
      if (!directory) {
        throw new Error("Unable to retrieve main directory");
      }

      fullPath = path.join(directory, filePath);
    }

    this.logger?.debug(`Reading file from ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
          let error = new Error("File does not exist : " + fullPath);
          error.name = "FILE_NOT_FOUND";
          return reject(error);
        }

        const stream = fs.createReadStream(fullPath, {
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
    const path = require("node:path");
    const fs = require("node:fs");

    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    let fullPath = path.join(directory, filePath);

    this.logger.info(`Deleting file from ${fullPath} ...`);
    return new Promise((resolve, reject) => {
      fs.access(fullPath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          let error = new Error("File does not exist : " + fullPath);
          error.name = "FILE_NOT_FOUND";
          return reject(error);
        }

        fs.rmSync(fullPath, {recursive: true, force: true});

        return resolve("");
      })
    })
  }

  async readFileHash(filePath: string): Promise<string> {
    const crypto = require("node:crypto");

    this.logger.debug(`Reading file hash : ${filePath} ...`);
    return this.readFile(filePath, true, true)
    .then((data: ArrayBuffer) => {
      return crypto.createHash('sha1')
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
    const path = require("node:path");
    const fs = require("node:fs");

    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    let fullPath = path.join(directory, filePath);

    this.logger.debug(`Checking if file exist : ${filePath} ...`);
    return new Promise((resolve, reject) => {
      fs.access(fullPath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          resolve(false);
        }

        resolve(true);
      })
    })
  }

  async extractFile(extractRequest: ExtractRequest): Promise<void> {
    const path = require("node:path");
    const decompress = require("decompress");

    let directory = process.env.APP_DIRECTORY;
    if (!directory) {
      throw new Error("Unable to retrieve main directory");
    }

    if (!extractRequest?.file) {
      throw new Error("Unable to retrieve file to extract");
    }

    let fullPath = path.join(directory, extractRequest.file.filePath(), extractRequest.file.fileName());
    let destFullPath = path.join(directory, extractRequest.destPath);
    let excludes = extractRequest.excludes;

    return decompress(fullPath, destFullPath, {
      filter: file => {
        let valid = true;
        if (extractRequest.includes) {
          if (file.type === 'file') {
            valid &&= extractRequest.includes.includes(file.path);
          } else {
            valid &&= extractRequest.includes.includes(path.basename(file.path));
          }
        }

        if (extractRequest.excludes) {
          if (file.type === 'file') {
            valid &&= !excludes.includes(file.path)
          } else {
            valid &&= !excludes.includes(path.basename(file.path));
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
    const os = require("node:os");

    let platform = os.machine();
    if (platform === 'x86_64') {
      platform = os.arch() !== 'x64' ? 'x86' : 'x64';
    }

    let OS = os.type()
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
      return '/bin/javaw.exe';
    }
    return '/bin/javaw'
  }
}
