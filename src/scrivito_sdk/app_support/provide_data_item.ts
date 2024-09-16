import memoize from 'lodash-es/memoize';

import { fetchSchema } from 'scrivito_sdk/app_support/fetch_schema';
import { RestApi } from 'scrivito_sdk/app_support/provide_data_class';
import { ApiClient, createRestApiClient } from 'scrivito_sdk/client';
import { isPromise } from 'scrivito_sdk/common';
import {
  DataClassAttributes,
  DataItem,
  ExternalDataItemConnection,
  provideExternalDataItem,
  registerDataClassSchema,
} from 'scrivito_sdk/data_integration';
import { assertValidDataIdentifier } from 'scrivito_sdk/models';

interface RestApiParams extends BaseParams {
  restApi: RestApi | Promise<RestApi>;
}

interface ConnectionParams extends BaseParams {
  connection: ExternalDataItemConnection | Promise<ExternalDataItemConnection>;
}

interface BaseParams {
  attributes?: DataClassAttributes;
}

/** @public */
export function provideDataItem(
  name: string,
  get: ExternalDataItemConnection['get']
): DataItem;

/** @public */
export function provideDataItem(
  name: string,
  params: RestApiParams | ConnectionParams
): DataItem;

/** @public */
export function provideDataItem(
  name: string,
  connection: ConnectionParams['connection']
): DataItem;

/** @internal */
export function provideDataItem(
  name: string,
  params:
    | ExternalDataItemConnection['get']
    | ConnectionParams['connection']
    | ConnectionParams
    | RestApiParams
): DataItem {
  assertValidDataIdentifier(name);

  if (typeof params === 'function') {
    return provideDataItem(name, { get: params });
  }

  if ('restApi' in params) {
    const { restApi } = params;

    if (isPromise(restApi)) {
      return provideDataItemWithAsyncRestApiConfig(name, {
        restApi,
        attributes: params.attributes,
      });
    }

    const apiClient =
      typeof restApi === 'string'
        ? createRestApiClient(restApi)
        : createRestApiClient(restApi.url, restApi);

    return provideDataItem(name, {
      connection: createRestApiConnectionForItem(apiClient),
      attributes: params.attributes || (() => fetchSchema(apiClient)),
    });
  }

  if ('connection' in params) {
    registerDataClassSchema(name, params.attributes);
    return provideDataItem(name, params.connection);
  }

  return provideExternalDataItem(name, params);
}

function provideDataItemWithAsyncRestApiConfig(
  name: string,
  params: {
    restApi: Promise<RestApi>;
    attributes?: DataClassAttributes;
  }
) {
  const memoizedApiClient = memoize(async () => {
    const restApi = await params.restApi;
    return typeof restApi === 'string'
      ? createRestApiClient(restApi)
      : createRestApiClient(restApi.url, restApi);
  });

  return provideDataItem(name, {
    connection: (async () => {
      return createRestApiConnectionForItem(await memoizedApiClient());
    })(),
    attributes:
      params.attributes || (async () => fetchSchema(await memoizedApiClient())),
  });
}

function createRestApiConnectionForItem(
  apiClient: ApiClient
): ExternalDataItemConnection {
  return {
    get: async () => apiClient.fetch(''),
    update: async (data) => apiClient.fetch('', { method: 'patch', data }),
  };
}
