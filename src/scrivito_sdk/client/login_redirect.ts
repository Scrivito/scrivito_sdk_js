import {
  RawResponse,
  RequestFailedError,
  getJrApiLocation,
} from 'scrivito_sdk/client';
import * as AuthFailureCounter from 'scrivito_sdk/client/auth_failure_counter';
import { parseErrorResponse } from 'scrivito_sdk/client/parse_error_response';
import { never, redirectTo } from 'scrivito_sdk/common';

const JR_API_LOCATION_PLACEHOLDER = '$JR_API_LOCATION';

export async function requestWithLoginRedirect(
  request: () => Promise<RawResponse>
): Promise<RawResponse> {
  const response = await request();

  const { httpStatus } = response;

  if (httpStatus >= 400 && httpStatus < 500) {
    const { code, details } = parseErrorResponse(response.responseText);

    if (code === 'auth_missing') {
      if (!isAuthMissingDetails(details)) throw new RequestFailedError();

      redirectTo(authenticationUrlFor(details.visit));
      return never();
    }
  }

  return response;
}

function authenticationUrlFor(visit: string): string {
  const retry = AuthFailureCounter.currentFailureCount();
  const returnTo = AuthFailureCounter.augmentedRedirectUrl();

  const authUrl = visit
    .replace('retry=RETRY', `retry=${retry}`)
    .replace('$RETURN_TO', encodeURIComponent(returnTo));

  if (authUrl.includes(JR_API_LOCATION_PLACEHOLDER)) {
    return authUrl.replace(JR_API_LOCATION_PLACEHOLDER, getJrApiLocation());
  }

  return authUrl;
}

interface AuthMissingDetails {
  visit: string;
}

function isAuthMissingDetails(details: Object): details is AuthMissingDetails {
  return typeof (details as AuthMissingDetails).visit === 'string';
}
