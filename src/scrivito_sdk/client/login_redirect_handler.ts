import { clientConfig } from 'scrivito_sdk/client';
import {
  InternalError,
  assignLocation,
  currentHref,
  never,
  onReset,
} from 'scrivito_sdk/common';

/** a LoginHander which redirects the browser to the login url */
export async function loginRedirectHandler(visit: string): Promise<void> {
  assignLocation(await authenticationUrl(visit));

  return never();
}

let loggedInParamName: string | undefined;

export function setLoggedInIndicatorParam(paramName: string): void {
  loggedInParamName = paramName;
}

async function authenticationUrl(visit: string): Promise<string> {
  const authUrl = visit.replace(
    '$RETURN_TO',
    encodeURIComponent(returnToUrl())
  );

  const iamAuthLocation = (await clientConfig.fetch()).iamAuthLocation;
  if (!iamAuthLocation) throw new InternalError();

  return authUrl.replace('$JR_API_LOCATION/iam/auth', iamAuthLocation);
}

function returnToUrl() {
  const url = new URL(currentHref());

  if (loggedInParamName) url.searchParams.set(loggedInParamName, '');

  return url.toString();
}

onReset(() => (loggedInParamName = undefined));
