import { fetchSchema } from 'scrivito_sdk/app_support/fetch_schema';
import { ApiClient } from 'scrivito_sdk/client';
import { LazyAsyncDataAttributeDefinitions } from 'scrivito_sdk/data_integration';
import { LazyAsyncDataClassTitle } from 'scrivito_sdk/data_integration/data_class_schema';

export function createRestApiSchema(
  {
    attributes,
    title,
  }: {
    attributes?: LazyAsyncDataAttributeDefinitions;
    title?: LazyAsyncDataClassTitle;
  },
  apiClient: Promise<ApiClient>
) {
  return {
    schema: {
      attributes:
        attributes ||
        (async () => (await fetchSchema(await apiClient)).attributes),
      title: title || (async () => (await fetchSchema(await apiClient)).title),
    },
  };
}
