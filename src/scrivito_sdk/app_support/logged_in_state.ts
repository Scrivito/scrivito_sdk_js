import { getConfiguredTenant } from 'scrivito_sdk/app_support/configured_tenant';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { USER_IS_LOGGED_IN_PARAM_NAME } from 'scrivito_sdk/client';
import {
  InternalError,
  ScrivitoError,
  currentHref,
  reload,
  replaceHistoryState,
} from 'scrivito_sdk/common';

let loggedInState: boolean | undefined;

export function initializeLoggedInState(): void {
  const url = new URL(currentHref());
  const searchParams = url.searchParams;

  if (searchParams.has(USER_IS_LOGGED_IN_PARAM_NAME)) {
    loggedInState = true;
    setFlagInLocalStorage();

    searchParams.delete(USER_IS_LOGGED_IN_PARAM_NAME);
    replaceHistoryState({}, '', url.toString());

    return;
  }

  loggedInState = isFlagPresentInLocalStorage();
}

export function isInLoggedInState() {
  if (loggedInState === undefined) {
    throw new ScrivitoError('not configured');
  }

  return loggedInState;
}

// for test purposes
export function resetLoggedInState() {
  loggedInState = undefined;
}

export function changeLoggedInState(state: boolean): void {
  if (state) setFlagInLocalStorage();
  else removeFlagFromLocalStorage();

  reload();
}

function setFlagInLocalStorage() {
  // Never write into the flag when inside UI!
  if (uiAdapter) return;

  try {
    localStorage.setItem(isUserLoggedInStorageKey(), '');
  } catch (_e: unknown) {
    // NOOP
  }
}

function removeFlagFromLocalStorage() {
  try {
    localStorage.removeItem(isUserLoggedInStorageKey());
  } catch (_e: unknown) {
    // NOOP
  }
}

function isFlagPresentInLocalStorage() {
  try {
    return localStorage.getItem(isUserLoggedInStorageKey()) !== null;
  } catch (_e: unknown) {
    //  If the runtime is paranoid enough to forbid the usage of `localStorage`,
    //  then they'll probably allow no cookies as well, so we're done here.
    return false;
  }
}

function isUserLoggedInStorageKey() {
  const configuredTenant = getConfiguredTenant();
  if (!configuredTenant) throw new InternalError();

  return `SCRIVITO.${configuredTenant}.IS_USER_LOGGED_IN`;
}
