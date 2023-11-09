import { JrRestApi } from 'scrivito_sdk/client';
import { LoadableData } from 'scrivito_sdk/loadable';
import { ensureConfiguredTenant } from './configured_tenant';

export interface UserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export function getUserInfo(): UserInfo | null | undefined {
  return loadableUserInfo.get();
}

export async function getUserInfoPath(): Promise<string> {
  const tenant = await ensureConfiguredTenant();

  return `iam/instances/${tenant}/userinfo`;
}

// For test purposes only
export function setUserInfo(userinfo: UserInfo | null): void {
  loadableUserInfo.set(userinfo);
}

const loadableUserInfo = new LoadableData<UserInfo | null>({
  loader: async () =>
    JrRestApi.getWithoutAuth(await getUserInfoPath()) as Promise<UserInfo>,
});

/** Throws an error, while data is still loading */
export function getUserInfoOrThrow(): UserInfo | null {
  return loadableUserInfo.getOrThrow();
}
