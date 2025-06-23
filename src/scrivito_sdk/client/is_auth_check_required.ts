import { ERROR_CODE_AUTH_CHECK_REQUIRED } from 'scrivito_sdk/client/login_handler';
import { registerAsyncTask } from 'scrivito_sdk/common';

export async function isAuthCheckRequired(
  response: Response
): Promise<boolean> {
  const responseJson = await registerAsyncTask(() => response.clone().json());

  return (
    'code' in responseJson &&
    responseJson.code === ERROR_CODE_AUTH_CHECK_REQUIRED
  );
}
