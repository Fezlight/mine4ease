import {CryptoProvider, PublicClientApplication} from "@azure/msal-node";
import {BrowserWindow} from "electron";
import {AuthProtocolListener} from "../listeners/AuthProtocolListener";
import {msalConfig, REDIRECT_URI} from "../config/AuthConfig";
import {Account, CacheProvider} from "mine4ease-ipc-api";
import {CURRENT_ACCOUNT_STORAGE_CACHE, CURRENT_ACCOUNT_STORAGE_KEY} from "../config/CacheConfig.ts";
import {logger} from "../config/ObjectFactoryConfig.ts";

export interface TokenResponse {
  IssueInstant: Date,
  NotAfter: Date,
  Token: string,
  DisplayClaims: {
    xui: [
      { uhs: string }
    ]
  }
}

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json"
};

export class AuthProvider {
  clientApplication;
  cryptoProvider;
  authCodeUrlParams;
  authCodeRequest;
  pkceCodes;
  accessToken: string | undefined;
  customFileProtocolName;

  constructor(cacheProvider: CacheProvider) {
    this.clientApplication = new PublicClientApplication(msalConfig);

    cacheProvider.put(CURRENT_ACCOUNT_STORAGE_KEY, CURRENT_ACCOUNT_STORAGE_CACHE);
    cacheProvider.loadObject(CURRENT_ACCOUNT_STORAGE_KEY)
      .then(object => this.accessToken = object?.accessToken)
      .catch(e => logger.error("Error when retrieving account profile settings", e))
    ;
    cacheProvider.delete(CURRENT_ACCOUNT_STORAGE_KEY);

    this.cryptoProvider = new CryptoProvider();
    this.customFileProtocolName = REDIRECT_URI.split(":")[0];

    const crypto = require('crypto');

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: arr => crypto.randomBytes(arr.length)
      }
    });

    this.setRequestObjects();
  }

  static createAuthWindow() {
    return new BrowserWindow({
      width: 400,
      height: 600,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#ffffff',
        height: 30
      },
    });
  }

  setRequestObjects() {
    const requestScopes = ["XboxLive.signin"];

    this.authCodeUrlParams = {
      scopes: requestScopes,
      redirectUri: REDIRECT_URI,
    };

    this.authCodeRequest = {
      scopes: requestScopes,
      redirectUri: REDIRECT_URI,
      code: null,
    };

    this.pkceCodes = {
      challengeMethod: "S256", // Use SHA256 Algorithm
      verifier: "", // Generate a code verifier for the Auth Code Request first
      challenge: "", // Generate a code challenge from the previously generated code verifier
    };
  }

  async loginWithMicrosoft() {
    return this.getTokenInteractive(this.authCodeUrlParams);
  }

  async loginXboxLive(microsoftToken: string): Promise<TokenResponse> {
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${microsoftToken}`
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT"
      })
    };

    return fetch("https://user.auth.xboxlive.com/user/authenticate", request)
      .then(response => response.json())
      .then(data => this.getXboxXstsToken(data.Token))
  }

  private async getXboxXstsToken(xboxToken: string): Promise<TokenResponse> {
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [
            xboxToken
          ]
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT"
      })
    };

    return fetch("https://xsts.auth.xboxlive.com/xsts/authorize", request)
      .then(response => response.json())
  }

  async loginMinecraft(userHash: string, xstsToken: string): Promise<Account> {
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`
      })
    };

    this.accessToken = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", request)
      .then(response => response.json())
      .then(response => response.access_token);

    return this.getProfile();
  }

  async getProfile(): Promise<Account> {
    const request = {
      headers: {
        ...headers,
        "Authorization": `Bearer ${this.accessToken}`
      }
    };

    return fetch("https://api.minecraftservices.com/minecraft/profile", request)
    .then((response: Response) => {
      if(!response.ok) {
        throw new Error("Error when trying to retrieve minecraft profile");
      }
      return response.json()
    })
    .then(response => {
      return {
        uuid: response.id,
        accessToken: this.accessToken,
        username: response.name
      }
    });
  }

  async logout() {
    this.accessToken = undefined;
  }

  async getTokenInteractive(tokenRequest) {
    /**
     * Proof Key for Code Exchange (PKCE) Setup
     *
     * MSAL enables PKCE in the Authorization Code Grant Flow by including the codeChallenge and codeChallengeMethod parameters
     * in the request passed into getAuthCodeUrl() API, as well as the codeVerifier parameter in the
     * second leg (acquireTokenByCode() API).
     *
     * MSAL Node provides PKCE Generation tools through the CryptoProvider class, which exposes
     * the generatePkceCodes() asynchronous API. As illustrated in the example below, the verifier
     * and challenge values should be generated previous to the authorization flow initiation.
     *
     * For details on PKCE code generation logic, consult the
     * PKCE specification https://tools.ietf.org/html/rfc7636#section-4
     */

    const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
    this.pkceCodes.verifier = verifier;
    this.pkceCodes.challenge = challenge;
    const popupWindow = AuthProvider.createAuthWindow();

    // Add PKCE params to Auth Code URL request
    const authCodeUrlParams = {
      ...this.authCodeUrlParams,
      scopes: tokenRequest.scopes,
      codeChallenge: this.pkceCodes.challenge, // PKCE Code Challenge
      codeChallengeMethod: this.pkceCodes.challengeMethod, // PKCE Code Challenge Method
    };

    try {
      // Get Auth Code URL
      const authCodeUrl = await this.clientApplication.getAuthCodeUrl(
        authCodeUrlParams
      );
      const authCode = await this.listenForAuthCode(authCodeUrl, popupWindow);
      // Use Authorization Code and PKCE Code verifier to make token request
      const authResult = await this.clientApplication.acquireTokenByCode({
        ...this.authCodeRequest,
        code: authCode,
        codeVerifier: verifier,
      });

      popupWindow.close();
      return authResult;
    } catch (error) {
      popupWindow.close();
      throw error;
    }
  }

  async listenForAuthCode(navigateUrl: string, authWindow: BrowserWindow) {
    // Set up custom file protocol to listen for redirect response
    const authCodeListener = new AuthProtocolListener(
      this.customFileProtocolName
    );
    const codePromise = authCodeListener.start();
    authWindow.loadURL(navigateUrl);
    const code = await codePromise;
    authCodeListener.close();
    return code;
  }
}
