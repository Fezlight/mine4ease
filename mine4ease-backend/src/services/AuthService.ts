import {Account, IAuthService, Cache, CacheProvider} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider";

export const CURRENT_ACCOUNT_STORAGE_KEY = "CURRENT_ACCOUNT"
export const ACCOUNTS_STORAGE_KEY = "ACCOUNTS"

export class AuthService implements IAuthService {
  private authProvider: AuthProvider;
  private cacheProvider: CacheProvider;

  constructor(authProvider: AuthProvider, cacheProvider: CacheProvider) {
    this.authProvider = authProvider;
    this.cacheProvider = cacheProvider;
  }

  async authenticate(): Promise<Account> {
    const account = await this.authProvider.loginWithMicrosoft()
      .then(data => this.authProvider.loginXboxLive(data.accessToken))
      .then(tokenResponse => this.authProvider.loginMinecraft(tokenResponse.DisplayClaims.xui[0]?.uhs, tokenResponse.Token));

    let cache = new Cache();
    cache.object = account;
    this.cacheProvider.put(CURRENT_ACCOUNT_STORAGE_KEY, cache);

    return account;
  }

  async getProfile(): Promise<Account | undefined> {
    if(this.cacheProvider.has(CURRENT_ACCOUNT_STORAGE_KEY)) {
      return this.cacheProvider.load(CURRENT_ACCOUNT_STORAGE_KEY)
        .then(cache => cache?.object);
    }
    return this.authProvider.getProfile();
  }

  disconnect(): Promise<void> {
    return this.authProvider.logout();
  }
}
