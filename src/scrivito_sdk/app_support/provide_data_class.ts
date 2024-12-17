import memoize from 'lodash-es/memoize';

import { fetchSchema } from 'scrivito_sdk/app_support/fetch_schema';
import { ApiClientOptions, createRestApiClient } from 'scrivito_sdk/client';
import { ArgumentError, isPromise } from 'scrivito_sdk/common';
import {
  DataClass,
  DataClassAttributes,
  DataConnection,
  ExternalDataClass,
  UncheckedDataConnection,
  createRestApiConnectionForClass,
  registerDataClassSchema,
  setExternalDataConnection,
} from 'scrivito_sdk/data_integration';
import { assertValidDataIdentifier } from 'scrivito_sdk/models';
import { getRealmClass } from 'scrivito_sdk/realm';

export type RestApi = string | ({ url: string } & ApiClientOptions);

/** @public */
export function provideDataClass(
  name: string,
  params: {
    restApi: RestApi | Promise<RestApi>;
    attributes?: DataClassAttributes;
  }
): DataClass;

/** @public */
export function provideDataClass(
  name: string,
  params: {
    connection: Partial<DataConnection> | Promise<Partial<DataConnection>>;
    attributes?: DataClassAttributes;
  }
): DataClass;

/** @internal */
export function provideDataClass(
  name: string,
  params: {
    connection:
      | Partial<UncheckedDataConnection>
      | Promise<Partial<UncheckedDataConnection>>;
    attributes?: DataClassAttributes;
  }
): DataClass;

/** @internal */
export function provideDataClass(
  name: string,
  params:
    | {
        restApi: RestApi | Promise<RestApi>;
        attributes?: DataClassAttributes;
      }
    | {
        connection:
          | Partial<UncheckedDataConnection>
          | Promise<Partial<UncheckedDataConnection>>;
        attributes?: DataClassAttributes;
      }
): DataClass {
  if (name === 'Obj') {
    throw new ArgumentError('"Obj" is not a valid data class name');
  }

  if (getRealmClass(name)) {
    throw new ArgumentError(`Class with name "${name}" already exists`);
  }

  assertValidDataIdentifier(name);

  if ('restApi' in params) {
    const { restApi } = params;

    if (isPromise(restApi)) {
      return provideDataClassWithAsyncRestApiConfig(name, {
        restApi,
        attributes: params.attributes,
      });
    }

    const apiClient =
      typeof restApi === 'string'
        ? createRestApiClient(restApi)
        : createRestApiClient(restApi.url, restApi);

    return provideDataClass(name, {
      connection: createRestApiConnectionForClass(apiClient),
      attributes: params.attributes || (() => fetchSchema(apiClient)),
    });
  }

  setExternalDataConnection(name, params.connection);
  registerDataClassSchema(name, params.attributes);

  return new ExternalDataClass(name);
}

function provideDataClassWithAsyncRestApiConfig(
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

  return provideDataClass(name, {
    connection: (async () => {
      return createRestApiConnectionForClass(await memoizedApiClient());
    })(),
    attributes:
      params.attributes || (async () => fetchSchema(await memoizedApiClient())),
  });
}
