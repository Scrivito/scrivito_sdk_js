import { isProbablyCloudUi } from 'scrivito_sdk/app_support/is_probably_cloud_ui';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { appUrlFromPackagedUiUrl, currentHref } from 'scrivito_sdk/common';

export function appUrlForRedirectToCloudUi(): string | null {
  if (isProbablyCloudUi()) return null;

  const currentLocation = currentHref();

  if (uiAdapter) return currentLocation;
  return appUrlFromPackagedUiUrl(currentLocation) || null;
}
