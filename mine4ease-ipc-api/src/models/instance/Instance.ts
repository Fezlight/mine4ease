export const INSTANCE_PATH = "/instances";

export class Instance {
  id: string;
  title: string;
  iconName: string;

  fullPath() {
    const path = require('node:path');
    return path.join(INSTANCE_PATH, this.id);
  }
}
