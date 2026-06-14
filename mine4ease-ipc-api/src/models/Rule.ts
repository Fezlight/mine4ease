import { Utils } from '../utils/Utils';

export class RuleControl {
  rules?: Rule[];
  installSide?: InstallSide;

  isRuleValid(): boolean {
    const platform = typeof process !== 'undefined' && process.platform ? process.platform : Utils.getBrowserPlatform().platform;
    const version = ""; // Default version if not in Node
    const arch = typeof process !== 'undefined' && process.arch ? process.arch : Utils.getBrowserPlatform().OS;
    return this.rules?.map(r => r.isRuleValid(platform, version, arch, this.installSide)).reduce((p, c) => p && c) ?? true;
  }
}

export class Rule {
  action: Action;
  os?: {
    name: string;
    version?: string;
    arch?: string;
  };
  features: Map<string, string>;
  side?: InstallSide;

  isRuleValid(platform: string, osVersion: string, arch: string, installSide?: InstallSide) {
    let cond = true;

    if(this.features) {
      return false;
    }

    if(this.os) {
      cond &&= OS[this.os.name as keyof OS] === platform;
      if(this.os.version) {
        cond &&= new RegExp(this.os.version).test(osVersion);
      }

      if(this.os.arch) {
        cond &&= arch === this.os.arch;
      }
    }

    if(this.side && installSide) {
      cond &&= this.side === installSide;
    }

    if(this.action === "allow") {
      return cond;
    } else if(this.action === "disallow") {
      return !cond;
    }

    return false;
  }
}

export class ArgRule extends RuleControl {
  value: string[] | string;
}

export type InstallSide = "client" | "server" | "common";

export type Action =  "allow" | "disallow";

export enum OS {
  windows = "win32" as any,
  osx = "darwin" as any,
  linux = "linux" as any,
}
