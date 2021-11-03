import * as AuthFailureCounter from 'scrivito_sdk/client/auth_failure_counter';
import { ClientError } from 'scrivito_sdk/client/client_error';
import { FetchOptions, Priority, fetch } from 'scrivito_sdk/client/fetch';
import * as PublicAuthentication from 'scrivito_sdk/client/public_authentication';
import { SessionData } from 'scrivito_sdk/client/session_data';
import { UnauthorizedError } from 'scrivito_sdk/client/unauthorized_error';
import {
  Deferred,
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
  perform: (
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
let retriesAreDisabled: true | undefined;

class CmsRestApi {
  // only public for test purposes
  tenant?: string;
  // only public for test purposes
  endpoint?: string;
  // only public for test purposes
  priority?: Priority;

  private authHeaderValueProvider: AuthorizationProvider;
  private forceVerification?: true;
  private initDeferred: Deferred;
  private url!: string;

  constructor() {
    this.initDeferred = new Deferred();
    this.authHeaderValueProvider = PublicAuthentication;
  }

  init(endpoint: string, tenant: string): void {
    this.tenant = tenant;
    this.endpoint = endpoint;
    this.url = `https://${endpoint}/tenants/${tenant}/perform`;
    this.initDeferred.resolve();
  }

  setPriority(priority: Priority) {
    this.priority = priority;
  }

  setAuthProvider(authorizationProvider: AuthorizationProvider) {
    this.authHeaderValueProvider = authorizationProvider;
  }

  get(path: string, requestParams?: ParamsType): Promise<BackendResponse> {
    return this.perform('GET', path, requestParams);
  }

  put(path: string, requestParams?: ParamsType): Promise<BackendResponse> {
    return this.perform('PUT', path, requestParams);
  }

  post(path: string, requestParams?: ParamsType): Promise<BackendResponse> {
    return this.perform('POST', path, requestParams);
  }

  delete(path: string, requestParams?: ParamsType): Promise<BackendResponse> {
    return this.perform('DELETE', path, requestParams);
  }

  requestBuiltInUserSession(sessionId: string, idp?: string) {
    const params = idp ? { idp } : undefined;
    return this.ensureInitialized()
      .then(() => this.ajax('PUT', `sessions/${sessionId}`, params))
      .then((response) => {
        AuthFailureCounter.reset();
        return response as SessionData;
      });
  }

  requestVisitorSession(
    sessionId: string,
    token: string
  ): Promise<VisitorSession> {
    return this.ensureInitialized().then(() => {
      return (this.ajax(
        'PUT',
        `sessions/${sessionId}`,
        undefined,
        `id_token ${token}`
      ) as unknown) as VisitorSession;
    });
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

  private ensureInitialized(): Promise<void> {
    return this.initDeferred.promise;
  }

  private perform(
    method: string,
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.ensureInitialized().then(() =>
      this.send(method, path, requestParams).then((result) =>
        isTaskResponse(result) ? this.handleTask(result.task) : result
      )
    );
  }

  private send(
    method: string,
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.authHeaderValueProvider.perform((authorization) =>
      this.ajax(method, path, requestParams, authorization)
    );
  }

  private ajax(
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

    const performRequest = (): Promise<BackendResponse> => {
      return retryOnRateLimit(() => fetch(method, this.url, options)).then(
        handleAjaxResponse
      );
    };

    return method === 'POST' ? performRequest() : retryOnError(performRequest);
  }

  private handleTask(
    task: TaskData
  ): BackendResponse | Promise<BackendResponse> {
    switch (task.status) {
      case 'success':
        return task.result;
      case 'error':
        throw new ClientError(task.message, task.code, {});
      case 'exception':
        throw new RequestFailedError(task.message);
      case 'open':
        return wait(2).then(() =>
          this.get(`tasks/${task.id}`).then((result: TaskData) =>
            this.handleTask(result)
          )
        );
      default:
        throw new RequestFailedError('Invalid task response (unknown status)');
    }
  }
}

function retryOnError(
  requestCallback: () => Promise<BackendResponse>,
  retryCount: number = 0
): Promise<BackendResponse> {
  if (retriesAreDisabled) {
    return new ScrivitoPromise((resolve) => resolve(requestCallback()));
  }

  return requestCallback().catch((error) => {
    if (error instanceof RequestFailedError) {
      if (limitedRetries && retryCount > 5) throw error;

      return waitMs(calculateDelay(retryCount)).then(() =>
        retryOnError(requestCallback, retryCount + 1)
      );
    }

    throw error;
  });
}

function retryOnRateLimit(
  requestCallback: () => Promise<XMLHttpRequest>,
  retryCount: number = 0
): Promise<XMLHttpRequest> {
  if (retriesAreDisabled) {
    return new ScrivitoPromise((resolve) => resolve(requestCallback()));
  }

  return requestCallback().then((response) => {
    if (response.status !== 429) return response;

    // The value for the retry count limit should be high enough to show that the integer overflow
    // protection of the calculated timeout (currently: exponent limited to 16) is working.
    if (limitedRetries && retryCount > 19) {
      throw new Error('Maximum number of rate limit retries reached');
    }

    const retryAfter = Number(response.getResponseHeader('Retry-After')) || 0;
    const retryDelay = Math.max(retryAfter * 1000, calculateDelay(retryCount));

    return waitMs(retryDelay).then(() =>
      retryOnRateLimit(requestCallback, retryCount + 1)
    );
  });
}

function calculateDelay(retryCount: number): number {
  return Math.pow(2, Math.min(retryCount, 16)) * 500;
}

function handleAjaxResponse(request: XMLHttpRequest) {
  const httpStatus: number = request.status;

  let responseData: JSONObject;
  try {
    responseData = JSON.parse(request.responseText);
  } catch (error) {
    throw new RequestFailedError(request.responseText);
  }

  if (httpStatus >= 200 && httpStatus < 300) {
    return responseData as BackendResponse;
  }

  const error = errorForResponse(
    httpStatus,
    responseData,
    request.responseText
  );

  if (error instanceof MissingAuthError) {
    redirectTo(error.target);
    return never();
  }

  throw error;
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
export function resetAndLimitRetries() {
  reset();
  limitedRetries = true;
}

// For test purpose only.
export function resetAndDisableRetries() {
  reset();
  retriesAreDisabled = true;
}

function reset() {
  cmsRestApi = new CmsRestApi();
  retriesAreDisabled = undefined;
}

export function requestBuiltInUserSession(
  sessionId: string,
  idp?: string
): Promise<SessionData> {
  return cmsRestApi.requestBuiltInUserSession(sessionId, idp);
}
