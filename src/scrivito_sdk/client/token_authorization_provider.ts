import { AuthorizationProvider } from 'scrivito_sdk/client';
import { ExponentialBackoff } from 'scrivito_sdk/client/exponential_backoff';

export class TokenAuthorizationProvider implements AuthorizationProvider {
  private cachedToken: string | undefined;

  constructor(private fetchToken: () => Promise<string>) {}

  async authorize(
    request: (auth: string | undefined) => Promise<Response>
  ): Promise<Response> {
    const backoff = new ExponentialBackoff();
    let fetchedTokenBefore = false;

    // note: using a loop instead of recursion avoids stack overflow
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!this.cachedToken) {
        if (fetchedTokenBefore) await backoff.nextDelay();

        this.cachedToken = await this.fetchToken();
        fetchedTokenBefore = true;
      }

      const response = await request(`Bearer ${this.cachedToken}`);

      if (response.status !== 401) return response;

      this.cachedToken = undefined;
    }
  }
}