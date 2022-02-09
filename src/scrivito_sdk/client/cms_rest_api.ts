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
  ScrivitoPromise,
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

let disabledMessage: string | undefined;

let limitedRetries: true | undefined;
let retriesAreDisabled: true | undefined;

class CmsRestApi {
  // only public for test purposes
  url!: string;
  // only public for test purposes
  priority?: Priority;

  private authHeaderValueProvider: AuthorizationProvider;
  private forceVerification?: true;
  private initDeferred: Deferred;

  constructor() {
    this.initDeferred = new Deferred();
    this.authHeaderValueProvider = PublicAuthentication;
  }

  init(apiBaseUrl: string): void {
    this.url = `${apiBaseUrl}/perform`;
    this.initDeferred.resolve();
  }

  rejectRequestsWith(message: string): void {
    disabledMessage = message;
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
    idp?: string
  ): Promise<SessionData> {
    await this.ensureEnabledAndInitialized();

    const params = idp ? { idp } : undefined;
    const response = await this.unsecuredRequest(
      'PUT',
      `sessions/${sessionId}`,
      params
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
    if (disabledMessage !== undefined) {
      throw new InternalError(disabledMessage);
    }
    return this.initDeferred.promise;
  }

  private async securedRequest(
    method: string,
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    await this.ensureEnabledAndInitialized();

    const result = await this.authHeaderValueProvider.authorize(
      (authorization) =>
        this.unsecuredRequest(method, path, requestParams, authorization)
    );

    return isTaskResponse(result) ? this.handleTask(result.task) : result;
  }

  private async unsecuredRequest(
    method: string,
    path: string,
    requestParams?: ParamsType,
    authorization?: string
  ): Promise<BackendResponse> {
    const options: FetchOptions = {
      authorization,
      forceVerification: this.forceVerification,
      params: {
        path,
        verb: method,
        params: requestParams || {},
      },
    };

    if (this.priority) {
      options.priority = this.priority;
    }

    return method === 'POST'
      ? requestAndHandleErrors(method, this.url, options)
      : retryOnError(() => requestAndHandleErrors(method, this.url, options));
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
}

async function requestAndHandleErrors(
  method: string,
  url: string,
  options: FetchOptions
): Promise<BackendResponse> {
  const { status: httpStatus, responseText } = await retryOnRateLimit(() =>
    fetch(method, url, options)
  );

  let responseData: JSONObject;
  try {
    responseData = JSON.parse(responseText);
  } catch (error) {
    throw new RequestFailedError(responseText);
  }

  if (httpStatus >= 200 && httpStatus < 300) {
    return responseData as BackendResponse;
  }

  const error = errorForResponse(httpStatus, responseData, responseText);

  if (error instanceof MissingAuthError) {
    redirectTo(error.target);
    return never();
  }

  throw error;
}

async function retryOnError(
  requestCallback: () => Promise<BackendResponse>,
  retryCount: number = 0
): Promise<BackendResponse> {
  if (retriesAreDisabled) {
    return new ScrivitoPromise((resolve) => resolve(requestCallback()));
  }

  return requestCallback().catch(async (error) => {
    if (error instanceof RequestFailedError) {
      if (limitedRetries && retryCount > 5) throw error;

      await waitMs(calculateDelay(retryCount));
      return retryOnError(requestCallback, retryCount + 1);
    }

    throw error;
  });
}

async function retryOnRateLimit(
  requestCallback: () => Promise<XMLHttpRequest>,
  retryCount: number = 0
): Promise<XMLHttpRequest> {
  if (retriesAreDisabled) {
    return new ScrivitoPromise((resolve) => resolve(requestCallback()));
  }

  const response = await requestCallback();
  if (response.status !== 429) return response;

  // The value for the retry count limit should be high enough to show that the integer overflow
  // protection of the calculated timeout (currently: exponent limited to 16) is working.
  if (limitedRetries && retryCount > 19) {
    throw new Error('Maximum number of rate limit retries reached');
  }

  const retryAfter = Number(response.getResponseHeader('Retry-After')) || 0;
  const retryDelay = Math.max(retryAfter * 1000, calculateDelay(retryCount));

  await waitMs(retryDelay);
  return retryOnRateLimit(requestCallback, retryCount + 1);
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

function errorForResponse(
  httpStatus: number,
  responseData: JSONObject,
  responseText: string
): Error {
  if (httpStatus.toString()[0] !== '4') {
    // The backend server responds with a proper error text on a server error.
    // If however not the backend server, but the surrounding infrastructure fails, then there is
    // no proper error text. In that case include the response text as a hint for debugging.
    const { error } = responseData;
    const message =
      httpStatus === 500 && typeof error === 'string' ? error : responseText;

    return new RequestFailedError(uniqueErrorMessage(message));
  }

  const { message: originalMessage, code, details } = parseBackendError(
    responseData
  );

  const message = uniqueErrorMessage(originalMessage);

  if (code === 'auth_missing') {
    return isAuthMissingDetails(details)
      ? new MissingAuthError(authenticationUrlFor(details.visit))
      : new RequestFailedError(
          'Malformed error response: key visit is not a string'
        );
  }

  if (code === 'precondition_not_met.workspace_not_found') {
    return new MissingWorkspaceError();
  }

  if (httpStatus === 401) return new UnauthorizedError(message, code, details);
  if (httpStatus === 403) return new AccessDeniedError(message, code, details);

  return new ClientError(message, code, details);
}

function authenticationUrlFor(visit: string): string {
  const returnTo = AuthFailureCounter.augmentedRedirectUrl();
  return visit
    .replace('retry=RETRY', `retry=${AuthFailureCounter.currentFailureCount()}`)
    .replace(/\$RETURN_TO/, encodeURIComponent(returnTo));
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
  retriesAreDisabled = undefined;
  disabledMessage = undefined;
}

export async function requestBuiltInUserSession(
  sessionId: string,
  idp?: string
): Promise<SessionData> {
  return cmsRestApi.requestBuiltInUserSession(sessionId, idp);
}
