import { currentLanguage } from 'scrivito_sdk/app_support/current_language';
import { ApiClient, ClientError } from 'scrivito_sdk/client';
import { logError } from 'scrivito_sdk/common';
import {
  DataClassSchema,
  isDataClassSchemaResponse,
} from 'scrivito_sdk/data_integration';
import { load } from 'scrivito_sdk/loadable';

export async function fetchSchema(
  apiClient: ApiClient
): Promise<DataClassSchema> {
  const siteLanguage = await load(currentLanguage);
  let response: unknown;

  try {
    response = await apiClient.fetch('schema', {
      headers: siteLanguage ? { 'Accept-Language': siteLanguage } : {},
    });
  } catch (error) {
    if (error instanceof ClientError) {
      logError(
        'Error while fetching schema (using empty schema)',
        error.message,
        JSON.stringify(error.details)
      );

      return {};
    }

    throw error;
  }

  if (isDataClassSchemaResponse(response)) {
    return response.attributes;
  }

  logError('Invalid schema (using empty schema)', JSON.stringify(response));
  return {};
}
