import { RawResponse } from 'scrivito_sdk/client';
import { requestWithLoginRedirect } from 'scrivito_sdk/client/login_redirect';
import { parseResponse } from 'scrivito_sdk/client/parse_response';
import {
  requestWithRateLimitRetry,
  retryOnRequestFailed,
} from 'scrivito_sdk/client/retry';

export function requestApiIdempotent(
  request: () => Promise<RawResponse>
): Promise<unknown> {
  return retryOnRequestFailed(() => requestApiNonIdempotent(request));
}

export async function requestApiNonIdempotent(
  request: () => Promise<RawResponse>
): Promise<unknown> {
  return parseResponse(
    await requestWithLoginRedirect(() => requestWithRateLimitRetry(request))
  );
}
