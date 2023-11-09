import { AuthorizationProvider, RequestFailedError } from 'scrivito_sdk/client';
import { authenticationUrl } from 'scrivito_sdk/client/authentication_url';
import { parseErrorResponse } from 'scrivito_sdk/client/parse_error_response';
import { never, redirectTo, registerAsyncTask } from 'scrivito_sdk/common';

export const loginRedirectAuthorizationProvider: AuthorizationProvider = {
  authorize(request: (auth: string | undefined) => Promise<Response>) {
    return requestAndHandleMissingAuth(request);
  },
};

async function requestAndHandleMissingAuth(
  request: (auth: string | undefined) => Promise<Response>
): Promise<Response> {
  const response = await request(undefined);

  const redirectUrl = await checkForRedirect(response);
  if (!redirectUrl) return response;

  redirectTo(await authenticationUrl(redirectUrl));

  return never();
}

async function checkForRedirect(
  response: Response
): Promise<string | undefined> {
  const httpStatus = response.status;

  if (httpStatus < 400 || httpStatus >= 500) return;

  // response.text is a macrotask in firefox.
  // it needs to be registered explicitly, to work with flushPromises.
  const responseText = await registerAsyncTask(() => response.clone().text());
  const { code, details } = parseErrorResponse(responseText);
  if (code !== 'auth_missing') return;
  if (!isAuthMissingDetails(details)) throw new RequestFailedError();

  return details.visit;
}

interface AuthMissingDetails {
  visit: string;
}

function isAuthMissingDetails(details: Object): details is AuthMissingDetails {
  return typeof (details as AuthMissingDetails).visit === 'string';
}
