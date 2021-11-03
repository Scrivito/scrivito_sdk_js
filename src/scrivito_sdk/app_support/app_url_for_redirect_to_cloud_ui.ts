import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { appUrlFromPackagedUiUrl, currentHref } from 'scrivito_sdk/common';

export function appUrlForRedirectToCloudUi(): string | null {
  // if the hosts differ, we probably are inside the Cloud UI already
  if (isParentHostDifferent()) return null;

  const currentLocation = currentHref();

  if (uiAdapter) return currentLocation;
  return appUrlFromPackagedUiUrl(currentLocation) || null;
}

function isParentHostDifferent(): boolean {
  const parentFrame = window.parent;

  // if we aren't inside an iframe, the hosts can't differ
  if (parentFrame === window) return false;

  return getFrameHost(parentFrame) !== window.location.host;
}

function getFrameHost(frame: Window): string | undefined {
  try {
    return frame.location.host;
  } catch (_ignore) {
    // an error means that the frame is cross-origin,
    // and therefore we are not allowed to know the host.
  }
}
