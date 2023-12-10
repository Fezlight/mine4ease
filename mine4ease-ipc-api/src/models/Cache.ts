export class Cache {
  path?: string; // Path without filename at end
  filename?: string;
  object?: any;

  async save(callback: Function) {
    if(!this.path) return;

    const file = {
      data: JSON.stringify(this.object),
      ...this
    };

    await callback(file);
  }

  async load(callback: Function): Promise<Cache> {
    if(!this.path) return this;
    if(this.object) return this;

    const path = require("node:path")
    await callback(path.join(this.path, this.filename)).then((response: string) => {
      this.object = JSON.parse(response);
    }).catch(() => this.object = {});

    return this;
  }
}
