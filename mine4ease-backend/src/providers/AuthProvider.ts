import {CryptoProvider, PublicClientApplication} from "@azure/msal-node";
import {BrowserWindow} from "electron";
import {AuthProtocolListener} from "../listeners/AuthProtocolListener";
import {msalConfig, REDIRECT_URI} from "../config/AuthConfig";
import {Account, CacheProvider} from "mine4ease-ipc-api";
import {CURRENT_ACCOUNT_STORAGE_KEY} from "../config/CacheConfig.ts";
import {logger} from "../config/ObjectFactoryConfig.ts";
import crypto from "crypto";

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
  clientApplication: PublicClientApplication;
  cryptoProvider;
  authCodeUrlParams: any;
  authCodeRequest: any;
  pkceCodes: any;
  accessToken: string | undefined;
  refreshToken: string | undefined;
  customFileProtocolName;

  constructor(cacheProvider: CacheProvider) {
    this.clientApplication = new PublicClientApplication(msalConfig);

    cacheProvider.loadObject(CURRENT_ACCOUNT_STORAGE_KEY)
      .then(object => this.accessToken = object?.accessToken)
      .catch(e => logger.error("Error when retrieving account profile settings", e))
    ;
    cacheProvider.delete(CURRENT_ACCOUNT_STORAGE_KEY);

    this.cryptoProvider = new CryptoProvider();
    this.customFileProtocolName = REDIRECT_URI.split(":")[0];

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (arr: string) => crypto.randomBytes(arr.length)
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
    const requestScopes = [
      "XboxLive.signin",
      "openid",
      "offline_access"
    ];

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
    return this.getTokenInteractive(this.authCodeUrlParams)
      .then((response: any) => {
        this.refreshToken = response.refreshToken;
        this.accessToken = response.accessToken;

        return response;
      });
  }

  async getMicrosoftToken(auth: {code: any, codeVerifier: any}) {
    const request = {
      method: "POST",
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        scope: this.authCodeRequest.scopes,
        client_id: msalConfig.auth.clientId,
        grant_type: "authorization_code",
        code: auth.code,
        code_verifier: auth.codeVerifier,
        redirect_uri: this.authCodeRequest.redirectUri
      })
    };

    return fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", request)
    .then((response: Response) => response.json())
    .then(reponse => {
      return {
        accessToken: reponse.access_token,
        refreshToken: reponse.refresh_token,
      }
    })
  }

  async loginWithMicrosoftRefreshToken(refreshToken: string) {
    const request = {
      method: "POST",
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        scope: this.authCodeRequest.scopes,
        client_id: msalConfig.auth.clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    };

    return fetch("https://login.live.com/oauth20_token.srf", request)
    .then((response: Response) => response.json())
    .then(response => {
      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token;

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      }
    })
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
      .then((response: Response) => response.json())
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
      .then((response: Response) => response.json())
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
      .then((response: Response) => response.json())
      .then(response => response.access_token);

    return this.getProfile();
  }

  async getProfile(accessToken?: string): Promise<Account> {
    const request = {
      headers: {
        ...headers,
        "Authorization": `Bearer ${accessToken ?? this.accessToken}`
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
        accessToken: accessToken ?? this.accessToken,
        refreshToken: this.refreshToken,
        username: response.name
      }
    });
  }

  async logout() {
    this.accessToken = undefined;
  }

  async getTokenInteractive(tokenRequest: any) {
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
      prompt: 'select_account'
    };

    try {
      // Get Auth Code URL
      const authCodeUrl = await this.clientApplication.getAuthCodeUrl(
        authCodeUrlParams
      );
      const authCode = await this.listenForAuthCode(authCodeUrl, popupWindow);
      // Use Authorization Code and PKCE Code verifier to make token request
      const authResult = await this.getMicrosoftToken({
        code: authCode,
        codeVerifier: verifier
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
