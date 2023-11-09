import { getJrRestApiEndpoint } from 'scrivito_sdk/client/jr_rest_api';
import { currentHref } from 'scrivito_sdk/common';

export const USER_IS_LOGGED_IN_PARAM_NAME = '__scrivitoUserIsLoggedIn';
const JR_API_LOCATION_PLACEHOLDER = '$JR_API_LOCATION';

let wantsUserIsLoggedInParam = true;

export function disableUserIsLoggedInParam(): void {
  wantsUserIsLoggedInParam = false;
}

// For test purpose only
export function resetUserIsLoggedInParam(): void {
  wantsUserIsLoggedInParam = true;
}

export async function authenticationUrl(visit: string): Promise<string> {
  const authUrl = visit.replace(
    '$RETURN_TO',
    encodeURIComponent(returnToUrl())
  );

  if (authUrl.includes(JR_API_LOCATION_PLACEHOLDER)) {
    return authUrl.replace(
      JR_API_LOCATION_PLACEHOLDER,
      await getJrRestApiEndpoint()
    );
  }

  return authUrl;
}

function returnToUrl() {
  const url = new URL(currentHref());

  if (wantsUserIsLoggedInParam) {
    url.searchParams.set(USER_IS_LOGGED_IN_PARAM_NAME, '');
  }

  return url.toString();
}
