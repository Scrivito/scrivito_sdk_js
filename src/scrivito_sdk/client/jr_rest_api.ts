// @rewire

import {
  AuthorizationProvider,
  fetchWithTimeout,
  requestApiIdempotent,
  requestApiNonIdempotent,
} from 'scrivito_sdk/client';
import {
  ApiClient,
  FetchData,
  FetchOptions,
  FetchParams,
} from 'scrivito_sdk/client/api_client';
import { Deferred } from 'scrivito_sdk/common';

let authProvider: AuthorizationProvider | undefined;

export function setJrRestApiAuthProvider(
  provider: AuthorizationProvider
): void {
  authProvider = provider;
}

// For test purpose only
export function getJrRestApiAuthProvider(): AuthorizationProvider | undefined {
  return authProvider;
}

let endpointDeferred = new Deferred<string>();

export function getJrRestApiEndpoint(): Promise<string> {
  return endpointDeferred.promise;
}

export function setJrRestApiEndpoint(endpoint: string): void {
  endpointDeferred.resolve(endpoint);
}

export async function getJrRestApiUrl(path: string): Promise<string> {
  const sanitizedPath = path.replace(/^\//, '');
  return `${await getJrRestApiEndpoint()}/${sanitizedPath}`;
}

// For test purpose only.
export function resetJrRestApi(): void {
  authProvider = undefined;
  endpointDeferred = new Deferred();
}

/** @public */
export const JrRestApi = new ApiClient(fetch);

async function fetch(path: string, options?: FetchOptions) {
  const method = options?.method?.toUpperCase() ?? 'GET';

  const plainRequest = async (authorization?: string) =>
    fetchWithTimeout(
      await calculateRequestUrl(path, options?.params),
      calculateOptions(method, options?.data, authorization)
    );

  const currentAuthProvider = authProvider;

  const withAuth = options?.withAuth ?? true;

  const sendRequest =
    currentAuthProvider && withAuth
      ? () => currentAuthProvider.authorize(plainRequest)
      : plainRequest;

  return method === 'POST'
    ? requestApiNonIdempotent(sendRequest)
    : requestApiIdempotent(sendRequest);
}

async function calculateRequestUrl(path: string, params?: FetchParams) {
  const apiUrl = new URL(await getJrRestApiUrl(path));

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        apiUrl.searchParams.append(name, value);
      }
    }
  }

  return apiUrl.toString();
}

function calculateOptions(
  method: string,
  data?: FetchData,
  authorization?: string
): RequestInit {
  const headers: Record<string, string> = {};

  if (data) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  if (authorization) {
    headers.Authorization = authorization;
  }

  return {
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
    headers,
    method,
  };
}
