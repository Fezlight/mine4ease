import {Account, IAuthService} from "mine4ease-ipc-api";

export class AuthService implements IAuthService {
  async authenticate(): Promise<any> {
    return window.ipcRenderer.invoke('authService.authenticate');
  }

  disconnect(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async getProfile(): Promise<Account | undefined> {
    return window.ipcRenderer.invoke('authService.getProfile');
  }
}
