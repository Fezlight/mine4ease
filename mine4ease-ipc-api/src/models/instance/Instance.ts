export const INSTANCE_PATH = "/instances";

export class Instance {
  id: string;
  title: string;
  iconName: string;

  fullPath() {
    return INSTANCE_PATH + "/" + this.id;
  }
}
