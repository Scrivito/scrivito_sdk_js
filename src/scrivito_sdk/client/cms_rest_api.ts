import { RequestFailedError, fetchJson } from 'scrivito_sdk/client';
import { ClientError } from 'scrivito_sdk/client/client_error';
import { getClientVersion } from 'scrivito_sdk/client/get_client_version';
import {
  LoginHandler,
  withLoginHandler,
} from 'scrivito_sdk/client/login_handler';
import { loginRedirectHandler } from 'scrivito_sdk/client/login_redirect_handler';
import { PublicAuthentication } from 'scrivito_sdk/client/public_authentication';
import { SessionData } from 'scrivito_sdk/client/session_data';
import {
  Deferred,
  InternalError,
  ScrivitoError,
  wait,
} from 'scrivito_sdk/common';

export class MissingWorkspaceError extends ScrivitoError {}

export interface AuthorizationProvider {
  currentState?: () => string | null;
  authorize: (
    request: (auth: string | undefined) => Promise<Response>
  ) => Promise<Response>;
}

export type BackendResponse = unknown;

type ParamsType = unknown;

interface SuccessfulTaskData {
  status: 'success';
  result: unknown;
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

let requestsAreDisabled: true | undefined;

export type Priority = 'foreground' | 'background';

let fallbackPriority: undefined | Priority;

export function useDefaultPriority(priority: Priority) {
  fallbackPriority = priority;
}
class CmsRestApi {
  // only public for test purposes
  url!: string;
  // only public for test purposes
  priority?: Priority;

  private authorizationProvider?: AuthorizationProvider;
  private initDeferred: Deferred;

  constructor() {
    this.initDeferred = new Deferred();
  }

  init({
    apiBaseUrl,
    authorizationProvider,
  }: {
    apiBaseUrl: string;
    authorizationProvider?: AuthorizationProvider;
  }): void {
    this.url = `${apiBaseUrl}/perform`;
    this.authorizationProvider = authorizationProvider ?? PublicAuthentication;
    this.initDeferred.resolve();
  }

  rejectRequests(): void {
    requestsAreDisabled = true;
  }

  setPriority(priority: Priority): void {
    this.priority = priority;
  }

  async get(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.requestWithTaskHandling({ method: 'GET', path, requestParams });
  }

  async put(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.requestWithTaskHandling({ method: 'PUT', path, requestParams });
  }

  async post(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.requestWithTaskHandling({
      method: 'POST',
      path,
      requestParams,
    });
  }

  async delete(
    path: string,
    requestParams?: ParamsType
  ): Promise<BackendResponse> {
    return this.requestWithTaskHandling({
      method: 'DELETE',
      path,
      requestParams,
    });
  }

  async requestBuiltInUserSession(
    sessionId: string,
    idp?: string
  ): Promise<SessionData> {
    const response = await this.request({
      method: 'PUT',
      path: `sessions/${sessionId}`,
      requestParams: idp ? { idp, type: 'iam' } : { type: 'iam' },
      loginHandler: loginRedirectHandler,
      authorizationProvider: null,
    });

    return response as SessionData;
  }

  async requestVisitorSession(
    sessionId: string,
    token: string
  ): Promise<VisitorSession> {
    return this.request({
      method: 'PUT',
      path: `sessions/${sessionId}`,
      requestParams: undefined,
      authorizationProvider: {
        authorize(request) {
          return request(`id_token ${token}`);
        },
      },
    }) as Promise<VisitorSession>;
  }

  // For test purpose only.
  currentPublicAuthorizationState(): string {
    if (this.authorizationProvider) {
      if (this.authorizationProvider.currentState) {
        return `[API] ${this.authorizationProvider.currentState() ?? 'null'}`;
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

  private async requestWithTaskHandling({
    method,
    path,
    requestParams,
  }: {
    method: string;
    path: string;
    requestParams?: ParamsType;
  }): Promise<BackendResponse> {
    const result = await this.request({ method, path, requestParams });

    return isTaskResponse(result) ? this.handleTask(result.task) : result;
  }

  private async request({
    method,
    path,
    requestParams,
    authorizationProvider,
    loginHandler,
  }: {
    method: string;
    path: string;
    requestParams?: ParamsType;
    authorizationProvider?: AuthorizationProvider | null;
    loginHandler?: LoginHandler;
  }): Promise<BackendResponse> {
    await this.ensureEnabledAndInitialized();

    try {
      return await withLoginHandler(
        loginHandler,
        () =>
          fetchJson(this.url, {
            method: method === 'POST' ? 'POST' : 'PUT',
            headers: this.getHeaders(),
            data: { path, verb: method, params: requestParams },
            authProvider: this.getAuthorizationProviderForRequest(
              authorizationProvider
            ),
            credentials: 'include',
          }) as Promise<Response>
      );
    } catch (error) {
      throw error instanceof ClientError &&
        error.code === 'precondition_not_met.workspace_not_found'
        ? new MissingWorkspaceError()
        : error;
    }
  }

  private getHeaders() {
    let headers: Record<string, string> = {
      'Scrivito-Client': getClientVersion(),
    };

    const priorityWithFallback = this.priority || fallbackPriority;

    if (priorityWithFallback === 'background') {
      headers = {
        ...headers,
        'Scrivito-Priority': priorityWithFallback,
      };
    }

    return headers;
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

  private getAuthorizationProviderForRequest(
    authorizationProvider: AuthorizationProvider | null | undefined
  ) {
    if (authorizationProvider === undefined) {
      if (!this.authorizationProvider) throw new InternalError();
      return this.authorizationProvider;
    }

    if (authorizationProvider === null) return undefined;

    return authorizationProvider;
  }
}

function isTaskResponse(result: unknown): result is TaskResponse {
  return (
    !!result &&
    !!(result as TaskResponse).task &&
    Object.keys(result as TaskResponse).length === 1
  );
}

export let cmsRestApi = new CmsRestApi();

// For test purpose only.
export function resetCmsRestApi(): void {
  cmsRestApi = new CmsRestApi();
  requestsAreDisabled = undefined;
}

export async function requestBuiltInUserSession(
  sessionId: string,
  idp?: string
): Promise<SessionData> {
  return cmsRestApi.requestBuiltInUserSession(sessionId, idp);
}
