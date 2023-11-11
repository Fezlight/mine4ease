export class Cache {
  path?: string; // Path without filename at end
  filename?: string;
  object?: any;

  save(callback: Function) {
    if(!this.path) return;

    const file = {
      data: JSON.stringify(this.object),
      ...this
    };

    callback(file);
  }

  async load(callback: Function): Promise<Cache> {
    if(!this.path) return this;
    if(this.object) return this;

    await callback(this.path).then((response: string) => {
      this.object = JSON.parse(response);
    });

    return this;
  }
}
