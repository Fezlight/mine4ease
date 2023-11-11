export interface Account {
  uuid?: string;
  username?: string;
  accessToken: string;
}

export class Accounts {
  accounts: Map<string, Account> = new Map<string, Account>();
  selectedAccount?: Account;
}
