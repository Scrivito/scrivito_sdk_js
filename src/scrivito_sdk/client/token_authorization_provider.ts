import {
  AuthorizationProvider,
  ClientError,
  ClientErrorRequestDetails,
} from 'scrivito_sdk/client';
import { ExponentialBackoff } from 'scrivito_sdk/client/exponential_backoff';
import { isAuthCheckRequired } from 'scrivito_sdk/client/is_auth_check_required';
import { ScrivitoError } from 'scrivito_sdk/common';

export class TokenAuthorizationError extends ScrivitoError {
  constructor(
    readonly message: string,
    readonly code: string | undefined,
    readonly httpStatus: number,
    readonly requestDetails: ClientErrorRequestDetails = {}
  ) {
    super(message);
  }
}

export class TokenAuthorizationProvider implements AuthorizationProvider {
  private fetchTokenPromise?: Promise<string | null>;

  constructor(private fetchToken: () => Promise<string | null>) {}

  async authorize(
    request: (auth?: string) => Promise<Response>
  ): Promise<Response> {
    const backoff = new ExponentialBackoff();
    let fetchedTokenBefore = false;

    // note: using a loop instead of recursion avoids stack overflow
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!this.fetchTokenPromise) {
        this.fetchTokenPromise = (async () => {
          if (fetchedTokenBefore) await backoff.nextDelay();
          fetchedTokenBefore = true;

          try {
            return await this.fetchToken();
          } catch (error) {
            if (error instanceof ClientError && error.httpStatus === 404) {
              throw new TokenAuthorizationError(
                error.message,
                error.code,
                error.httpStatus,
                error.requestDetails
              );
            }

            throw error;
          }
        })();
      }

      const tokenPromise = this.fetchTokenPromise;

      const token = await tokenPromise;
      const response =
        token === null ? await request() : await request(`Bearer ${token}`);

      if (response.status !== 401 || (await isAuthCheckRequired(response))) {
        return response;
      }

      // is token renewal already in progress? (concurrency)
      if (tokenPromise === this.fetchTokenPromise) {
        // if not: trigger renewal
        this.fetchTokenPromise = undefined;
      }
    }
  }

  /** for test purposes */
  injectToken(token: string): void {
    this.fetchTokenPromise = Promise.resolve(token);
  }
}
