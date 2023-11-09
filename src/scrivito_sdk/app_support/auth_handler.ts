import { UserData } from 'scrivito_sdk/app_support/user';

export interface AuthHandler {
  getUserData(): UserData | undefined;
  isUserLoggedIn(): boolean;
  ensureUserIsLoggedIn(): void;
}
