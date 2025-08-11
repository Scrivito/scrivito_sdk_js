import { getEditorAuthToken } from 'scrivito_sdk/app_support/get_editor_auth_token';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import {
  ExponentialBackoff,
  fetchBrowserToken,
  loginRedirectHandler,
  withLoginHandler,
} from 'scrivito_sdk/client';
import { ArgumentError } from 'scrivito_sdk/common';
import { load } from 'scrivito_sdk/loadable';

interface Result<T> {
  result: T;
}

interface AuthenticationFailed {
  authenticationFailed: {
    error: string;
    code: string;
    details?: object;
  };
}

type ResultOrAuthenticationFailed<T> = Result<T> | AuthenticationFailed;

/** @public */
export async function performWithIamToken<T>(
  audience: string,
  callback: (token: string) => Promise<ResultOrAuthenticationFailed<T>>
): Promise<T> {
  let fetchTokenPromise: Promise<unknown> | undefined;

  const backoff = new ExponentialBackoff();
  let fetchedTokenBefore = false;

  // note: using a loop instead of recursion avoids stack overflow
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!fetchTokenPromise) {
      fetchTokenPromise = (async () => {
        if (fetchedTokenBefore) await backoff.nextDelay();
        fetchedTokenBefore = true;

        return uiAdapter
          ? load(() => getEditorAuthToken({ audience }))
          : withLoginHandler(loginRedirectHandler, async () =>
              fetchBrowserToken({ audience })
            );
      })();
    }

    const tokenResult = await fetchTokenPromise;

    if (typeof tokenResult === 'string') {
      const outcome = await callback(tokenResult);
      assertIsResultOrAuthenticationFailed(outcome);

      if ('result' in outcome) return outcome.result;
    }

    fetchTokenPromise = undefined;
  }
}

function assertIsResultOrAuthenticationFailed<T>(
  outcome: unknown
): asserts outcome is ResultOrAuthenticationFailed<T> {
  if (
    !(
      outcome &&
      typeof outcome === 'object' &&
      ('result' in outcome ||
        ('authenticationFailed' in outcome &&
          outcome.authenticationFailed &&
          typeof outcome.authenticationFailed === 'object' &&
          'error' in outcome.authenticationFailed &&
          'code' in outcome.authenticationFailed))
    )
  ) {
    throw new ArgumentError(
      `performWithIamToken callback returned an invalid response: ${JSON.stringify(
        outcome
      )} ` +
        'Expected an object with either { result } or { authenticationFailed: { error, code } }.'
    );
  }
}
