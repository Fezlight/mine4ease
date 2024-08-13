import {Account} from "../models/Accounts";

export interface IAuthService {
  authenticate(): Promise<Account>;
  authenticateWithRefreshToken(refreshToken: string): Promise<Account>;
  getProfile(): Promise<Account | undefined>;
  disconnect(): Promise<void>;
}

