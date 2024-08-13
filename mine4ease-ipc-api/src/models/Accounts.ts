export interface Account {
  uuid?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string
}

export class Accounts {
  accounts: Map<string, Account> = new Map<string, Account>();
  selectedAccount?: Account;
}
