// @rewire

import { clientConfig } from 'scrivito_sdk/client';
import { ApiClient, FetchOptions } from 'scrivito_sdk/client/api_client';
import { getBrowserTokenProvider } from 'scrivito_sdk/client/browser_token';
import { fetchJson } from 'scrivito_sdk/client/fetch_json';
import { joinPaths } from 'scrivito_sdk/client/join_paths';
import { withLoginHandler } from 'scrivito_sdk/client/login_handler';
import { loginRedirectHandler } from 'scrivito_sdk/client/login_redirect_handler';

export async function getJrRestApiUrl(path: string): Promise<string> {
  return joinPaths((await clientConfig.fetch()).jrApiLocation, path);
}

/** @public */
export const JrRestApi = new ApiClient(fetch);

async function fetch(path: string, options?: FetchOptions) {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const config = await clientConfig.fetch();

  const url = await getJrRestApiUrl(path);

  const loginHandler =
    options?.loginHandler ??
    (config.loginHandler === 'redirect' ? loginRedirectHandler : undefined);

  return withLoginHandler(loginHandler, () =>
    fetchJson(url, {
      data: options?.data,
      authProvider: options?.unstable_forceCookie
        ? undefined
        : config.iamAuthProvider ?? getBrowserTokenProvider(),
      params: options?.params,
      method,
    })
  );
}
