import { ERROR_CODE_AUTH_CHECK_REQUIRED } from 'scrivito_sdk/client/login_handler';
import { registerAsyncTask } from 'scrivito_sdk/common';

export async function isHighSecurityAction(
  response: Response
): Promise<boolean> {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) return false;

  const clonedResponse = response.clone();

  const responseJson = await registerAsyncTask(() => {
    try {
      return clonedResponse.json();
    } catch {
      return Promise.resolve();
    }
  });

  if (!responseJson) return false;

  return (
    response.status === 401 &&
    responseJson.code === ERROR_CODE_AUTH_CHECK_REQUIRED
  );
}
