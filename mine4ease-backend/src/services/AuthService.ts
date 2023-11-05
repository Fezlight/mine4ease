import {IAuthService} from "mine4ease-ipc-api";
import {AuthProvider} from "../providers/AuthProvider";

export class AuthService implements IAuthService {
  private authProvider: AuthProvider;

  constructor(authProvider: AuthProvider) {
    this.authProvider = authProvider;
  }

  async authenticate(): Promise<any> {
    return this.authProvider.loginWithMicrosoft()
      .then(data => this.authProvider.loginXboxLive(data.accessToken))
      .then(data => this.authProvider.loginMinecraft(data.DisplayClaims.xui[0]?.uhs, data.Token));
  }
}
