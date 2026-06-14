export class Cache {
  path?: string; // Path without filename at end
  filename?: string;
  object?: any;

  async save(callback: Function) {
    if(!this.path) return;

    const file = {
      data: JSON.stringify(this.object, null, 2),
      ...this
    };

    await callback(file);
  }

  async load(callback: Function): Promise<Cache> {
    if(!this.path) return this;
    if(this.object) return this;

    let fullPath = (this.path ?? "") + "/" + (this.filename ?? "");
    if (typeof nodePath !== 'undefined') {
      fullPath = nodePath.join(this.path ?? "", this.filename ?? "");
    }
    await callback(fullPath).then((response: string) => {
      this.object = JSON.parse(response);
    }).catch(() => this.object = {});

    return this;
  }
}
