import {Cache} from "../models/Cache";
import {Utils} from "../utils/Utils";

export interface ICacheProvider {

  /**
   * Load an object from cache
   *
   * @param key key related to object used to retrieve it
   * @return promise of cache or undefined if not found
   */
  load(key: string): Promise<Cache | undefined>;

  /**
   * Alias method for load(key: string) but extract object from cache and return it
   *
   * @param key key related to object used to retrieve it
   * @return promise of object or undefined if not found or empty
   */
  loadObject(key: string): Promise<any>

  /**
   * Put an object inside cache
   *
   * @param key key related to object used to retrieve it
   * @param object object to save (only json object)
   */
  put(key: string, object: Cache): void;

  /**
   * Update an object inside cache
   *
   * @param key key related to object used to retrieve it
   * @param object object to save (only json object)
   *
   * @throws Error if key not exist in cache
   */
  update(key: string, object: any): Promise<void>

  /**
   * Check if a key exist in cache
   *
   * @return true if key exist, false otherwise
   */
  has(key: string): boolean;

  /**
   * Save all object from cache if needed
   *
   * (defined in Cache object)
   */
  saveAll(): Promise<void[]>;

  /**
   * Delete an object from cache
   *
   * @param key key related to object used to retrieve it
   * @return true if element was deleted in cache, false otherwise
   */
  delete(key: string): boolean;
}

export class CacheProvider implements ICacheProvider {
  private caches = new Map<string, Cache>();
  private utils: Utils;

  constructor(utils: Utils) {
    this.utils = utils;
  }

  async load(key: string): Promise<Cache | undefined> {
    return Promise.resolve(this.caches.get(key))
    .then(cache => cache?.load((f: any) => this.utils.readFile(f)))
    .catch(() => undefined);
  }

  async loadObject(key: string): Promise<any> {
    return this.load(key)
    .then(cache => cache?.object);
  }

  async update(key: string, object: any): Promise<void> {
    return this.load(key).then(cache => {
      if (!cache) throw new Error(`Cache ${key} not found`);

      cache.object = object;
      return cache;
    }).then(cache => this.put(key, cache));
  }

  put(key: string, object: Cache): void {
    this.caches.set(key, object);
  }

  async saveAll(): Promise<void[]> {
    let promises: Promise<void>[] = [];

    this.caches.forEach((v) => {
      promises.push(v.save((f: any) => this.utils.saveFile(f)));
    });

    return Promise.all(promises);
  }

  delete(key: string): boolean {
    return this.caches.delete(key);
  }

  has(key: string): boolean {
    return this.caches.has(key);
  }
}
