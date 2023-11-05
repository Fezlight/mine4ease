import {IAuthService} from "mine4ease-ipc-api";

export class AuthService implements IAuthService {
  authenticate(): Promise<any> {
    return window.ipcRenderer.invoke('authService.authenticate');
  }
}
