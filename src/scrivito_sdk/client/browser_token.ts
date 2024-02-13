import {
  ClientError,
  TokenAuthorizationProvider,
  getJrRestApiUrl,
} from 'scrivito_sdk/client';
import { fetchJson } from 'scrivito_sdk/client/fetch_json';
import { isAuthMissingClientError } from 'scrivito_sdk/client/login_handler';
import {
  InternalError,
  fetchConfiguredTenant,
  onTestReset,
} from 'scrivito_sdk/common';

let cachedProvider: TokenAuthorizationProvider | undefined;

onTestReset(() => {
  cachedProvider = undefined;
});

export function getBrowserTokenProvider(): TokenAuthorizationProvider {
  cachedProvider ||= new TokenAuthorizationProvider(() =>
    fetchBrowserToken({ audience: 'https://api.justrelate.com' })
  );

  return cachedProvider;
}

/** for test purposes */
export function injectBrowserToken(token: string): void {
  getBrowserTokenProvider().injectToken(token);
}

interface RegularBrowserTokenParams {
  audience: string;
  origin?: undefined;
}

interface UiEditorAuthTokenParams {
  audience: string | undefined;
  origin: string;
}

type BrowserTokenParams = RegularBrowserTokenParams | UiEditorAuthTokenParams;

export async function fetchBrowserToken({
  audience,
  origin,
}: BrowserTokenParams): Promise<string> {
  const instanceId = await fetchConfiguredTenant();
  const authLocation = await getJrRestApiUrl('/iam/auth');

  try {
    const response = await fetchJson(
      `${authLocation}/instance/${instanceId}/token`,
      { params: { audience, origin } }
    );

    assertTokenResponse(response);

    return response.access_token;
  } catch (error: unknown) {
    throw resolveLocationInAuthError(error, authLocation);
  }
}

function resolveLocationInAuthError(
  error: unknown,
  authLocation: string
): unknown {
  if (!isAuthMissingClientError(error)) return error;

  return new ClientError(error.message, error.code, {
    visit: error.details.visit.replace('$JR_AUTH_LOCATION', authLocation),
  });
}

function assertTokenResponse(
  response: unknown
): asserts response is { access_token: string } {
  if (
    response &&
    typeof response === 'object' &&
    'access_token' in response &&
    typeof response.access_token === 'string'
  ) {
    return;
  }

  throw new InternalError();
}
