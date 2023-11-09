import { anonymousVisitorAuthHandler } from 'scrivito_sdk/app_support/anonymous_visitor_auth_handler';
import { insideUiAuthHandler } from 'scrivito_sdk/app_support/inside_ui_auth_handler';
import { isInLoggedInState } from 'scrivito_sdk/app_support/logged_in_state';
import { loggedInVisitorAuthHandler } from 'scrivito_sdk/app_support/logged_in_visitor_auth_handler';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { User } from 'scrivito_sdk/app_support/user';
import { getJrRestApiUrl } from 'scrivito_sdk/client';
import { redirectTo } from 'scrivito_sdk/common';

/** @public */
export function currentUser(): User | null {
  const userData = authHandler().getUserData();

  return userData ? new User(userData) : null;
}

/** @public */
export function isUserLoggedIn(): boolean {
  return authHandler().isUserLoggedIn();
}

/** @public */
export function ensureUserIsLoggedIn(): void {
  return authHandler().ensureUserIsLoggedIn();
}

/** @public */
export function logout(): void {
  logoutAsync();
}

async function logoutAsync() {
  redirectTo(await getJrRestApiUrl('iam/logout'));
}

function authHandler() {
  if (uiAdapter) return insideUiAuthHandler;
  if (isInLoggedInState()) return loggedInVisitorAuthHandler;

  return anonymousVisitorAuthHandler;
}
