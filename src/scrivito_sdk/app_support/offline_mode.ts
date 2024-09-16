import {
  Configuration,
  getConfiguration,
} from 'scrivito_sdk/app_support/configure';
import { isRunningInBrowser } from 'scrivito_sdk/app_support/node_adapter';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import {
  ScrivitoError,
  getConfiguredTenant,
  getFromLocalStorage,
  onReset,
  reload,
  removeFromLocalStorage,
  setInLocalStorage,
} from 'scrivito_sdk/common';
import {
  deleteAllCaches,
  isOfflineStoreEnabled,
  setOfflineMode,
  waitUntilWritingFinished,
} from 'scrivito_sdk/loadable';

let offlineMode: boolean | undefined;

export function initOfflineMode(): void {
  setOfflineMode(
    (async () => determineOfflineMode(await getConfiguration()))()
  );
}

/** @beta */
export function enterOfflineMode(): void {
  if (!isInOfflineMode()) {
    if (!isOfflineStoreEnabled()) {
      throw new ScrivitoError(
        'Offline store has not been enabled: Forgot to call Scrivito.enabledOfflineStore()?'
      );
    }

    setInLocalStorage(getOfflineModeStorageKey(), 'true');
    waitUntilWritingFinishedAndReload();
  }
}

async function waitUntilWritingFinishedAndReload() {
  await waitUntilWritingFinished();
  reload();
}

/** @beta */
export function leaveOfflineMode(): void {
  if (isInOfflineMode()) {
    removeFromLocalStorage(getOfflineModeStorageKey());
    reload();
  }
}

/** @beta */
export function isInOfflineMode(): boolean {
  if (offlineMode === undefined) {
    throw new ScrivitoError(
      'Offline mode has not been allowed in the editing config'
    );
  }

  return offlineMode;
}

export function getOfflineMode(): boolean | undefined {
  return offlineMode;
}

/** @beta */
export async function deleteOfflineStore(): Promise<void> {
  if (isInOfflineMode()) {
    throw new ScrivitoError('Cannot delete the offline store in offline mode');
  }

  return deleteAllCaches();
}

function determineOfflineMode(config: Configuration) {
  if (offlineMode === undefined) offlineMode = calculateOfflineMode(config);

  return offlineMode;
}

function calculateOfflineMode(config: Configuration) {
  if (!config.unstable?.allowOfflineMode) return false;
  if (!!uiAdapter || !isRunningInBrowser()) return false;

  return !!getOfflineModeFromStorage();
}

function getOfflineModeFromStorage() {
  return getFromLocalStorage(getOfflineModeStorageKey());
}

function getOfflineModeStorageKey() {
  return `SCRIVITO.${getConfiguredTenant()}.OFFLINE_MODE`;
}

onReset(resetOfflineMode);

// For test purposes only
export function resetOfflineMode(): void {
  offlineMode = undefined;
}
