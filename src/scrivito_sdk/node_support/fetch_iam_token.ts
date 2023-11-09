import type { IamApiKey } from 'scrivito_sdk/app_support/configure';
import { fetchWithTimeout, requestApiIdempotent } from 'scrivito_sdk/client';

interface IamTokenResponse {
  access_token: string;
}

export async function fetchIamToken(apiKey: IamApiKey): Promise<string> {
  const response = await requestApiIdempotent(() =>
    fetchWithTimeout('https://api.justrelate.com/iam/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(
          `${encodeURIComponent(apiKey.clientId)}:${encodeURIComponent(
            apiKey.clientSecret
          )}`
        )}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
  );

  return (response as IamTokenResponse).access_token;
}
