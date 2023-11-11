import {Cache} from "../models/Cache";
import {Utils} from "../utils/Utils";

export interface ICacheProvider {

  /**
   * Load an object from cache
   *
   * @param key key related to object used to retrieve it
   * @return promise of object or null if not found
   */
  load(key: string): Promise<Cache | undefined>;

  /**
   * Put an object inside cache
   *
   * @param key key related to object used to retrieve it
   * @param object object to save (only json object)
   */
  put(key: string, object: Cache): void;

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
  saveAll(): void;

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
      .then(cache => cache?.load(this.utils.readFile));
  }

  put(key: string, object: Cache): void {
    this.caches.set(key, object);
  }

  saveAll(): void {
    this.caches.forEach((v) => {
      v.save(this.utils.saveFile)
    });
  }

  delete(key: string): boolean {
    return this.caches.delete(key);
  }

  has(key: string): boolean {
    return this.caches.has(key);
  }
}
