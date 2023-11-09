import type { AuthorizationProvider } from 'scrivito_sdk/client';

export class BearerTokenAuthorizationProvider implements AuthorizationProvider {
  constructor(readonly tokenPromise: () => Promise<string | undefined>) {}

  async authorize(request: (auth: string | undefined) => Promise<Response>) {
    const token = await this.tokenPromise();
    return request(token ? `Bearer ${token}` : undefined);
  }
}
