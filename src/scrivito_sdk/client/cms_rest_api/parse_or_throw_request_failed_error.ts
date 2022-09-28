import { RequestFailedError } from 'scrivito_sdk/client';
import { JSONObject } from 'scrivito_sdk/client/cms_rest_api';

export function parseOrThrowRequestFailedError(jsonText: string): JSONObject {
  try {
    return JSON.parse(jsonText);
  } catch (_error) {
    throw new RequestFailedError(jsonText);
  }
}
