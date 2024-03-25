// @rewire

import { clientConfig } from 'scrivito_sdk/client';
import { createApiClient } from 'scrivito_sdk/client/create_api_client';
import { joinPaths } from 'scrivito_sdk/client/join_paths';
import { InternalError } from 'scrivito_sdk/common';

export async function getIamAuthUrl(path = ''): Promise<string> {
  const iamAuthLocation = (await clientConfig.fetch()).iamAuthLocation;
  if (!iamAuthLocation) throw new InternalError();

  return joinPaths(iamAuthLocation, path);
}

/** @public */
export const JrRestApi = createApiClient('https://api.justrelate.com');
