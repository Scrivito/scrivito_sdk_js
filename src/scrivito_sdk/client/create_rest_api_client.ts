import {
  LoginHandler,
  TokenAuthorizationProvider,
  clientConfig,
  getTokenProvider,
} from 'scrivito_sdk/client';
import {
  ApiClient,
  ApiClientHeaders,
  ApiClientOptions,
  FetchOptions,
} from 'scrivito_sdk/client/api_client';
import { fetchJson } from 'scrivito_sdk/client/fetch_json';
import { joinPaths } from 'scrivito_sdk/client/join_paths';
import { withLoginHandler } from 'scrivito_sdk/client/login_handler';
import { loginRedirectHandler } from 'scrivito_sdk/client/login_redirect_handler';

/** @public */
export function createRestApiClient(
  baseUrl: string,
  options?: ApiClientOptions
): ApiClient {
  return new ApiClient(
    async (url, fetchOptions?) => fetch(joinPaths(baseUrl, url), fetchOptions),
    options
  );
}

async function fetch(
  url: string,
  {
    audience,
    data,
    headers,
    loginHandler,
    method: verb,
    params,
    authViaAccount,
    authViaInstance,
    credentials,
  }: FetchOptions = {}
) {
  const method = verb?.toUpperCase() ?? 'GET';
  const authorization =
    headers && 'Authorization' in headers ? headers.Authorization : undefined;

  let handler: LoginHandler | undefined;
  let authProvider: TokenAuthorizationProvider;
  if (authorization === undefined) {
    const config = await clientConfig.fetch();

    handler =
      loginHandler ??
      (config.loginHandler === 'redirect' ? loginRedirectHandler : undefined);

    authProvider = getTokenProvider({
      audience: audience || new URL(url).origin,
      ...(authViaAccount && { authViaAccount }),
      ...(authViaInstance && { authViaInstance }),
    });
  }

  const fetchFn = () =>
    fetchJson(url, {
      data,
      authProvider,
      headers: removeNullValues(headers),
      skipAuthorization: authorization === null || !!authorization,
      params,
      method,
      credentials,
    });

  return method === 'GET' ? withLoginHandler(handler, fetchFn) : fetchFn();
}

function removeNullValues(headers: ApiClientHeaders = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, v]) => v !== null)
  );
}
