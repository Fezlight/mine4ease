import {Account, Cache, CacheProvider, IAuthService} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider";
import {CURRENT_ACCOUNT_STORAGE_CACHE, CURRENT_ACCOUNT_STORAGE_KEY} from "../config/CacheConfig";
import {Logger} from "winston";
import {$authProvider, $cacheProvider, logger} from "../config/ObjectFactoryConfig.ts";

export class AuthService implements IAuthService {
  private authProvider: AuthProvider;
  private cacheProvider: CacheProvider;
  private logger: Logger;

  constructor(authProvider: AuthProvider, cacheProvider: CacheProvider, logger: Logger) {
    this.authProvider = authProvider;
    this.cacheProvider = cacheProvider;
    this.logger = logger;
  }

  async authenticate(): Promise<Account> {
    this.logger.info("Authenticating with microsoft ...");
    const account = await this.authProvider.loginWithMicrosoft()
    .then(data => this.authProvider.loginXboxLive(data.accessToken))
    .then(tokenResponse => this.authProvider.loginMinecraft(tokenResponse.DisplayClaims.xui[0]?.uhs, tokenResponse.Token));

    await this.initAuthCache(account);

    return account;
  }

  async authenticateWithRefreshToken(refreshToken: string): Promise<Account> {
    this.logger.info("Authenticating with microsoft refresh token ...");
    const account = await this.authProvider.loginWithMicrosoftRefreshToken(refreshToken)
    .then(data => this.authProvider.loginXboxLive(data.accessToken!))
    .then(tokenResponse => this.authProvider.loginMinecraft(tokenResponse.DisplayClaims.xui[0]?.uhs, tokenResponse.Token));

    await this.initAuthCache(account);

    return account;
  }

  async getProfile(): Promise<Account | undefined> {
    this.logger.info("Retrieving minecraft profile ...");

    let account: Account | undefined;
    if (this.cacheProvider.has(CURRENT_ACCOUNT_STORAGE_KEY)) {
      account = await this.cacheProvider.loadObject(CURRENT_ACCOUNT_STORAGE_KEY);
    }

    return this.authProvider.getProfile(account?.accessToken)
    .then(acc => {
      this.logger.info("Minecraft token validated successfully");
      account = {
        ...account,
        username: acc.username,
        uuid: acc.uuid
      };
      return account;
    })
    .catch(async e => {
      if (!account?.refreshToken) {
        throw new Error("No refresh token found");
      }

      return await this.authenticateWithRefreshToken(account.refreshToken)
      .then(data => this.authProvider.getProfile(data?.accessToken))
    })
    .catch(e => {
      this.logger.error("Minecraft token invalid, re-authentication needed", e);
      let error = new Error("Minecraft token invalid, re-authentication needed");
      error.name = "MINECRAFT_AUTHENTICATION_FAILED";
      throw error;
    });
  }

  disconnect(): Promise<void> {
    return this.authProvider.logout();
  }

  async initAuthCache(account: Account) {
    let cache = {
      ...CURRENT_ACCOUNT_STORAGE_CACHE,
      object: account
    };
    this.cacheProvider.put(CURRENT_ACCOUNT_STORAGE_KEY, Object.assign(new Cache(), cache));
    await this.cacheProvider.saveAll();
  }
}

export const $authService = new AuthService($authProvider, $cacheProvider, logger);
