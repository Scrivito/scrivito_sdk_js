import {
  BackendResponse,
  VisitorSession,
  cmsRestApi,
} from 'scrivito_sdk/client/cms_rest_api';
import * as PublicAuthentication from 'scrivito_sdk/client/public_authentication';
import { UnauthorizedError } from 'scrivito_sdk/client/unauthorized_error';
import {
  Deferred,
  ScrivitoError,
  randomId,
  throwNextTick,
} from 'scrivito_sdk/common';

type SendRequest = (
  authorization: string | undefined
) => Promise<BackendResponse>;

/**
 * The VisitorAuthenticationProvider is responsible to provide the visitor
 * session to authenticate backend requests for a Scrivito configured with
 * visitor authentication.
 *
 * The visitor session is retrieved from backend using the id token that
 * the provider has received. Backend requests are delayed until the first
 * session response arrives.
 *
 * Responses of visitor session authenticated backend requests are monitored
 * if they indicate an expired session, and retried either with a fresh
 * visitor session or without authentication.
 */
export class VisitorAuthenticationProvider {
  private readonly sessionId = randomId();
  private idToken = new Deferred<string>();
  private sessionRequest: Promise<VisitorSession>;
  private state = 'waiting for token';

  constructor() {
    this.sessionRequest = this.fetchSession();
  }

  setToken(token: string) {
    if (!this.idToken.isPending()) {
      this.idToken = new Deferred();
      this.renewSession();
    }
    this.idToken.resolve(token);
    this.state = `active - token: ${token.substr(0, 3)}...`;
  }

  currentState(): string {
    return this.state;
  }

  perform(sendRequest: SendRequest): Promise<BackendResponse> {
    const sessionRequest = this.sessionRequest;
    return sessionRequest.then(
      (session) =>
        sendRequest(`Session ${session.token}`).catch((error) => {
          const sessionHasExpired = error instanceof UnauthorizedError;
          if (!sessionHasExpired) throw error;
          if (this.sessionRequest === sessionRequest) this.renewSession();
          return this.perform(sendRequest);
        }),
      (_error) => PublicAuthentication.perform(sendRequest)
    );
  }

  private renewSession() {
    this.sessionRequest = this.fetchSession();
  }

  private fetchSession() {
    return this.idToken.promise
      .then((token) => cmsRestApi.requestVisitorSession(this.sessionId, token))
      .catch((error) => {
        throwNextTick(
          new ScrivitoError(
            `Failed to establish visitor session: ${error.message}`
          )
        );
        throw error;
      });
  }
}
