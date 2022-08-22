import * as AuthFailureCounter from 'scrivito_sdk/client/auth_failure_counter';
import { ClientError } from 'scrivito_sdk/client/client_error';
import { FetchOptions, Priority, fetch } from 'scrivito_sdk/client/fetch';
import * as PublicAuthentication from 'scrivito_sdk/client/public_authentication';
import { SessionData } from 'scrivito_sdk/client/session_data';
import { UnauthorizedError } from 'scrivito_sdk/client/unauthorized_error';
import {
  Deferred,
  InternalError,
  ScrivitoError,
  never,
  redirectTo,
  uniqueErrorMessage,
  wait,
  waitMs,
} from 'scrivito_sdk/common';

export class MissingAuthError extends ScrivitoError {
  constructor(readonly target: string) {
    super(`Insufficient authorization - please visit ${target}`);
  }
}

export class AccessDeniedError extends ClientError {}
export class RequestFailedError extends ScrivitoError {}
export class MissingWorkspaceError extends ScrivitoError {}

export class RateLimitExceededError extends ScrivitoError {
  constructor(readonly message: string, readonly retryAfter: number) {
    super(message);
  }
}

export interface AuthorizationProvider {
  currentState?: () => string | null;
  authorize: (
    request: (auth: string | undefined) => Promise<BackendResponse>
  ) => Promise<BackendResponse>;
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue | undefined;
}

export type JSONArray = Array<JSONValue>;

export type BackendResponse = unknown;

type ParamsType = unknown;

interface BackendError {
  message: string;
  code: string;
  details: unknown;
}

interface SuccessfulTaskData {
  status: 'success';
  result: JSONObject;
}

interface OpenTaskData {
  status: 'open';
  id: string;
}

interface FailedTaskData {
  status: 'error';
  message: string;
  code: string;
}

interface ExceptionTaskData {
  status: 'exception';
  message: string;
}

type TaskData =
  | OpenTaskData
  | SuccessfulTaskData
  | FailedTaskData
  | ExceptionTaskData;

interface TaskResponse {
  task: TaskData;
}

export interface VisitorSession {
  id: string;
  role: 'visitor';
  token: string;
  maxage: number;
}

let limitedRetries: true | undefined;
let requestsAreDisabled: true | undefined;
let retriesAreDisabled: true | undefined;

const JR_API_LOCATION_PLACEHOLDER = '$JR_API_LOCATION';

class CmsRestApi {
  // only public for test purposes
  url!: string;
  // only public for test purposes
  jrApiLocation: string | null = null;
  // only public for test purposes
  priority?: Priority;

  private authHeaderValueProvider: AuthorizationProvider;
  private forceVerification?: true;
  private initDeferred: Deferred;

  constructor() {
    this.initDeferred = new Deferred();
    this.authHeaderValueProvider = PublicAuthentication;
  }

  init({
    apiBaseUrl,
    jrApiLocation,
  }: {
    apiBaseUrl: string;
    jrApiLocation?: string;
  }): void {
    this.url = `${apiBaseUrl}/perform`;
    this.jrApiLocation = jrApiLocation ?? null;
    this.initDeferred.resolve();
  }

  rejectRequests(): void {
    requestsAreDisabled = true;
  }

  setPriority(priority: Priority): void {
    this.priority = priority;
  }

  setAuthProvider(authorizationProvider: AuthorizationProvider): void {
    this.authHeaderValueProvider = authorizationProvider;
  }

  async get(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.securedRequest('GET', path, requestParams);
  }

  async put(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.securedRequest('PUT', path, requestParams);
  }

  async post(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.securedRequest('POST', path, requestParams);
  }

  async delete(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.securedRequest('DELETE', path, requestParams);
  }

  async requestBuiltInUserSession(
    sessionId: string,
    params?: { idp: string }
  ): Promise<SessionData> {
    await this.ensureEnabledAndInitialized();

    const response = await this.unsecuredRequest(
      'PUT',
      `sessions/${sessionId}`,
      params,
      null
    );

    AuthFailureCounter.reset();

    return response as SessionData;
  }

  async requestVisitorSession(
    sessionId: string,
    token: string
  ): Promise<VisitorSession> {
    await this.ensureEnabledAndInitialized();

    return this.unsecuredRequest(
      'PUT',
      `sessions/${sessionId}`,
      undefined,
      `id_token ${token}`
    ) as Promise<VisitorSession>;
  }

  // For test purpose only.
  enableForceVerification(): void {
    this.forceVerification = true;
  }

  // For test purpose only.
  currentPublicAuthorizationState(): string {
    if (this.authHeaderValueProvider) {
      if (this.authHeaderValueProvider.currentState) {
        return `[API] ${this.authHeaderValueProvider.currentState()}`;
      }
      return '[API]: authorization provider without currentState()';
    }
    return '[API]: no authorization provider';
  }

  private async ensureEnabledAndInitialized(): Promise<void> {
    if (requestsAreDisabled) {
      // When connected to a UI, all communications of an SDK app with the backend
      // must go through the UI adapter.
      throw new InternalError('Unexpected CMS backend access.');
    }
    return this.initDeferred.promise;
  }

  private async securedRequest(
    method: string,
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    await this.ensureEnabledAndInitialized();

    const result = await this.unsecuredRequest(method, path, requestParams);

    return isTaskResponse(result) ? this.handleTask(result.task) : result;
  }

  private async unsecuredRequest(
    method: string,
    path: string,
    requestParams?: ParamsType,
    authorization?: string | null
  ): Promise<BackendResponse> {
    return method === 'POST'
      ? this.requestAndHandleErrors(method, path, requestParams, authorization)
      : this.retryOnError(() =>
          this.requestAndHandleErrors(
            method,
            path,
            requestParams,
            authorization
          )
        );
  }

  private async handleTask(task: TaskData): Promise<BackendResponse> {
    switch (task.status) {
      case 'success':
        return task.result;
      case 'error':
        throw new ClientError(task.message, task.code, {});
      case 'exception':
        throw new RequestFailedError(task.message);
      case 'open': {
        await wait(2);

        const result = await this.get(`tasks/${task.id}`);
        return this.handleTask(result as TaskData);
      }
      default:
        throw new RequestFailedError('Invalid task response (unknown status)');
    }
  }

  private async requestAndHandleErrors(
    method: string,
    path: string,
    params?: ParamsType,
    authorization?: string | null
  ): Promise<BackendResponse> {
    try {
      return await this.retryOnRateLimit({
        method,
        path,
        params,
        authorization,
      });
    } catch (error: unknown) {
      if (error instanceof MissingAuthError) {
        redirectTo(error.target);
        return never();
      }

      throw error;
    }
  }

  private async retryOnError(
    requestCallback: () => Promise<BackendResponse>,
    retryCount: number = 0
  ): Promise<BackendResponse> {
    if (retriesAreDisabled) return requestCallback();

    try {
      return await requestCallback();
    } catch (error: unknown) {
      if (
        error instanceof RequestFailedError &&
        !(limitedRetries && retryCount > 5)
      ) {
        await waitMs(calculateDelay(retryCount));
        return this.retryOnError(requestCallback, retryCount + 1);
      }

      throw error;
    }
  }

  private async retryOnRateLimit(
    {
      method,
      path,
      params,
      authorization: providedAuthorization,
    }: {
      method: string;
      path: string;
      params?: ParamsType;
      authorization?: string | null;
    },
    retryCount: number = 0
  ): Promise<BackendResponse> {
    try {
      return providedAuthorization === undefined
        ? await this.authHeaderValueProvider.authorize((authorization) =>
            this.requestAndParseError({
              method,
              path,
              params,
              authorization,
            })
          )
        : await this.requestAndParseError({
            method,
            path,
            params,
            authorization: providedAuthorization,
          });
    } catch (e: unknown) {
      if (e instanceof RateLimitExceededError && !retriesAreDisabled) {
        // The value for the retry count limit should be high enough to show that the integer overflow
        // protection of the calculated timeout (currently: exponent limited to 16) is working.
        if (limitedRetries && retryCount > 19) {
          throw new Error('Maximum number of rate limit retries reached');
        }

        await waitMs(Math.max(e.retryAfter * 1000, calculateDelay(retryCount)));

        return this.retryOnRateLimit(
          {
            method,
            path,
            params,
            authorization: providedAuthorization,
          },
          retryCount + 1
        );
      }

      throw e;
    }
  }

  private async requestAndParseError({
    method,
    path,
    params,
    authorization,
  }: {
    method: string;
    path: string;
    params?: ParamsType;
    authorization?: string | null;
  }): Promise<BackendResponse> {
    const response = await fetch(
      method,
      this.url,
      this.getFetchOptions({
        method,
        path,
        params,
        authorization,
      })
    );

    let responseData: JSONObject;

    const { responseText, status: httpStatus } = response;

    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      throw new RequestFailedError(responseText);
    }

    if (httpStatus >= 200 && httpStatus < 300) {
      return responseData as BackendResponse;
    }

    throw this.errorForResponse(response, responseData);
  }

  private getFetchOptions({
    method,
    path,
    params,
    authorization,
  }: {
    method: string;
    path: string;
    params?: ParamsType;
    authorization?: string | null;
  }): FetchOptions {
    const options: FetchOptions = {
      authorization: authorization || undefined,
      forceVerification: this.forceVerification,
      params: {
        path,
        verb: method,
        params: params || {},
      },
    };

    if (this.priority) options.priority = this.priority;

    return options;
  }

  private errorForResponse(
    response: XMLHttpRequest,
    responseData: JSONObject
  ): Error {
    const { status: httpStatus, responseText } = response;

    if (httpStatus.toString()[0] !== '4') {
      // The backend server responds with a proper error text on a server error.
      // If however not the backend server, but the surrounding infrastructure fails, then there is
      // no proper error text. In that case include the response text as a hint for debugging.
      const { error } = responseData;
      const message =
        httpStatus === 500 && typeof error === 'string' ? error : responseText;

      return new RequestFailedError(uniqueErrorMessage(message));
    }

    const {
      message: originalMessage,
      code,
      details,
    } = parseBackendError(responseData);

    const message = uniqueErrorMessage(originalMessage);

    if (code === 'auth_missing') {
      return isAuthMissingDetails(details)
        ? new MissingAuthError(this.authenticationUrlFor(details.visit))
        : new RequestFailedError(
            'Malformed error response: key visit is not a string'
          );
    }

    if (code === 'precondition_not_met.workspace_not_found') {
      return new MissingWorkspaceError();
    }

    if (httpStatus === 401) {
      return new UnauthorizedError(message, code, details);
    }
    if (httpStatus === 403) {
      return new AccessDeniedError(message, code, details);
    }

    if (httpStatus === 429) {
      return new RateLimitExceededError(
        message,
        Number(response.getResponseHeader('Retry-After')) || 0
      );
    }

    return new ClientError(message, code, details);
  }

  private authenticationUrlFor(visit: string): string {
    const retry = AuthFailureCounter.currentFailureCount();
    const returnTo = AuthFailureCounter.augmentedRedirectUrl();

    const authUrl = visit
      .replace('retry=RETRY', `retry=${retry}`)
      .replace('$RETURN_TO', encodeURIComponent(returnTo));

    if (authUrl.includes(JR_API_LOCATION_PLACEHOLDER)) {
      return authUrl.replace(
        JR_API_LOCATION_PLACEHOLDER,
        this.getJrApiLocation()
      );
    }

    return authUrl;
  }

  private getJrApiLocation() {
    if (this.jrApiLocation) {
      return this.jrApiLocation;
    }

    throw new ScrivitoError(
      'CmsRestApi needs a JR API location, but none has been configured.'
    );
  }
}

function calculateDelay(retryCount: number): number {
  return Math.pow(2, Math.min(retryCount, 16)) * 500;
}

interface AuthMissingDetails {
  visit: string;
}

function isAuthMissingDetails(details: unknown): details is AuthMissingDetails {
  return typeof (details as AuthMissingDetails).visit === 'string';
}

function isTaskResponse(result: unknown): result is TaskResponse {
  return (
    !!result &&
    !!(result as TaskResponse).task &&
    Object.keys(result as TaskResponse).length === 1
  );
}

function parseBackendError({ error, code, details }: JSONObject): BackendError {
  if (typeof error !== 'string') {
    throw new RequestFailedError(
      'Malformed error response: key error is not a string'
    );
  }

  if (code !== undefined && typeof code !== 'string') {
    throw new RequestFailedError(
      'Malformed error response: optional key code is not a string'
    );
  }

  return {
    message: error,
    code: code || '',
    details: details || {},
  };
}

export let cmsRestApi = new CmsRestApi();

// For test purpose only.
export function resetAndLimitRetries(): void {
  reset();
  limitedRetries = true;
}

// For test purpose only.
export function resetAndDisableRetries(): void {
  reset();
  retriesAreDisabled = true;
}

function reset(): void {
  cmsRestApi = new CmsRestApi();
  requestsAreDisabled = undefined;
  retriesAreDisabled = undefined;
}

export async function requestBuiltInUserSession(
  sessionId: string,
  params?: { idp: string }
): Promise<SessionData> {
  return cmsRestApi.requestBuiltInUserSession(sessionId, params);
}
