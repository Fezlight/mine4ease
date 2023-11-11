import {Account, IAuthService} from "mine4ease-ipc-api";

export class AuthService implements IAuthService {
  async authenticate(): Promise<any> {
    return window.ipcRenderer.invoke('authService.authenticate')
      .then(JSON.parse);
  }

  disconnect(): Promise<void> {
    return Promise.resolve(undefined);
  }

  getProfile(): Promise<Account | undefined> {
    return Promise.resolve(undefined);
  }
}
