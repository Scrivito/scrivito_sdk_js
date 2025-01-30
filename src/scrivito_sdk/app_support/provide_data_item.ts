import { createRestApiSchema } from 'scrivito_sdk/app_support/create_rest_api_schema';
import { RestApi } from 'scrivito_sdk/app_support/provide_data_class';
import { ApiClient, createRestApiClient } from 'scrivito_sdk/client';
import {
  DataItem,
  ExternalDataClass,
  ExternalDataItemConnection,
  LazyAsyncDataAttributeDefinitions,
  LazyAsyncDataClassTitle,
  SINGLETON_DATA_ID,
  provideExternalDataItem,
} from 'scrivito_sdk/data_integration';
import { assertValidDataIdentifier } from 'scrivito_sdk/models';

type AsyncOrSync<Type> = Promise<Type> | Type;

type CommonProvideDataItemParams = {
  attributes?: LazyAsyncDataAttributeDefinitions;
  title?: LazyAsyncDataClassTitle;
};

type ProvideDataItemParams =
  | ({
      restApi: AsyncOrSync<RestApi>;
    } & CommonProvideDataItemParams)
  | ({
      connection: AsyncOrSync<ExternalDataItemConnection>;
    } & CommonProvideDataItemParams);

/** @public */
export function provideDataItem(
  name: string,
  get: ExternalDataItemConnection['get']
): DataItem;

/** @public */
export function provideDataItem(
  name: string,
  params: AsyncOrSync<ProvideDataItemParams>
): DataItem;

/** @public */
export function provideDataItem(
  name: string,
  connection: AsyncOrSync<ExternalDataItemConnection>
): DataItem;

/** @internal */
export function provideDataItem(
  name: string,
  params:
    | AsyncOrSync<ProvideDataItemParams | ExternalDataItemConnection>
    | ExternalDataItemConnection['get']
): DataItem {
  assertValidDataIdentifier(name);

  const dataClass = new ExternalDataClass(name);

  const resolvedParams =
    typeof params === 'function'
      ? Promise.resolve({ get: params })
      : Promise.resolve(params);

  provideExternalDataItem(
    dataClass,
    (async () => desugar(await resolvedParams))()
  );

  return dataClass.getUnchecked(SINGLETON_DATA_ID);
}

function desugar(
  params:
    | ProvideDataItemParams
    | ExternalDataItemConnection
    | ExternalDataItemConnection['get']
) {
  if (typeof params === 'function') {
    return {
      connection: Promise.resolve({ get: params }),
      schema: { attributes: {} },
    };
  }

  if ('restApi' in params) {
    const apiClient = createApiClient(Promise.resolve(params.restApi));

    return {
      connection: (async () =>
        createRestApiConnectionForItem(await apiClient))(),
      ...createRestApiSchema(
        { attributes: params.attributes, title: params.title },
        apiClient
      ),
    };
  }

  if ('connection' in params) {
    return {
      connection: Promise.resolve(params.connection),
      schema: { attributes: params.attributes ?? {}, title: params.title },
    };
  }

  return {
    connection: Promise.resolve(params),
    schema: { attributes: {} },
  };
}

async function createApiClient(restApiPromise: Promise<RestApi>) {
  const restApi = await restApiPromise;

  return typeof restApi === 'string'
    ? createRestApiClient(restApi)
    : createRestApiClient(restApi.url, restApi);
}

function createRestApiConnectionForItem(
  apiClient: ApiClient
): ExternalDataItemConnection {
  return {
    get: async () => apiClient.fetch(''),
    update: async (data) => apiClient.fetch('', { method: 'patch', data }),
  };
}
