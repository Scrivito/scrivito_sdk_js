export interface FetchParams {
  [name: string]: string | null | undefined;
}

export interface FetchData {
  [name: string]: unknown;
}

type Method =
  | 'delete'
  | 'get'
  | 'patch'
  | 'post'
  | 'put'
  | 'DELETE'
  | 'GET'
  | 'PATCH'
  | 'POST'
  | 'PUT';

export interface FetchOptions {
  params?: FetchParams;
  data?: FetchData;
  method?: Method;
  // note: only for internal use, will be removed in the future
  withAuth?: boolean;
}

type Fetch = (path: string, options?: FetchOptions) => Promise<unknown>;

/** given a 'fetch' method, construct an ApiClient which offers convenience
 * methods for getting, putting etc.
 */
export class ApiClient {
  constructor(public fetch: Fetch) {}

  get(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, method: 'GET' });
  }

  // note: only for internal use. will be remove in the future.
  getWithoutAuth(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, withAuth: false });
  }

  post(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, method: 'POST' });
  }

  put(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, method: 'PUT' });
  }

  patch(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, method: 'PATCH' });
  }

  delete(path: string, options?: FetchOptions): Promise<unknown> {
    return this.fetch(path, { ...options, method: 'DELETE' });
  }
}
