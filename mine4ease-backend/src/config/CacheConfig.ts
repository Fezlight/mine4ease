import {Cache} from "mine4ease-ipc-api";

export const SETTINGS_FILE = "instances.json";
export const AUTH_FILE = "authentication.json";

export const SETTINGS_KEY = "SETTINGS";
export const SETTINGS_CACHE: Cache = new Cache();
SETTINGS_CACHE.filename = SETTINGS_FILE;
SETTINGS_CACHE.path = "/";

export const CURRENT_ACCOUNT_STORAGE_KEY = "CURRENT_ACCOUNT";
export const CURRENT_ACCOUNT_STORAGE_CACHE: Cache = new Cache();
CURRENT_ACCOUNT_STORAGE_CACHE.filename = AUTH_FILE;
CURRENT_ACCOUNT_STORAGE_CACHE.path = "/";

export const defaultCaches = new Map<string, Cache>();
defaultCaches.set(SETTINGS_KEY, SETTINGS_CACHE);
defaultCaches.set(CURRENT_ACCOUNT_STORAGE_KEY, CURRENT_ACCOUNT_STORAGE_CACHE);

