export class RuleControl {
  rules?: Rule[];
  installSide?: InstallSide;

  isRuleValid(): boolean {
    return this.rules?.map(r => r.isRuleValid(this.installSide)).reduce((p, c) => p && c) ?? true;
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

  isRuleValid(installSide?: InstallSide) {
    const os = require('os');
    let cond = true;

    if(this.features) {
      return false;
    }

    if(this.os) {
      cond &&= OS[this.os.name as keyof OS] === os.platform();
      if(this.os.version) {
        cond &&= new RegExp(this.os.version).test(os.version());
      }

      if(this.os.arch) {
        cond &&= os.arch() === this.os.arch;
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
