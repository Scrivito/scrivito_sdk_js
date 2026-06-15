import { BrowserTokenParams } from 'scrivito_sdk/client';
import { joinPaths } from 'scrivito_sdk/client/join_paths';
import { ConfigStore, InternalError } from 'scrivito_sdk/common';

export type TokenFetcher = (
  params: BrowserTokenParams,
) => Promise<string | null>;

interface ClientConfig {
  iamAuthLocation?: string;
  iamTokenFetcher?: TokenFetcher;
  loginHandler?: 'redirect' | 'error';
}

export const clientConfig = new ConfigStore<ClientConfig>();

export async function getIamAuthUrl(path = ''): Promise<string> {
  const iamAuthLocation = (await clientConfig.fetch()).iamAuthLocation;
  if (!iamAuthLocation) throw new InternalError();

  return joinPaths(iamAuthLocation, path);
}
