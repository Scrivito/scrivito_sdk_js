import {
  DataClassAttributes,
  DataItem,
  ExternalDataItemConnection,
  assertValidDataIdentifier,
  provideExternalDataItem,
  registerDataClassSchema,
} from 'scrivito_sdk/data_integration';

interface Params {
  connection: ExternalDataItemConnection;
  attributes?: DataClassAttributes;
}

/** @public */
export function provideDataItem(
  name: string,
  get: ExternalDataItemConnection['get']
): DataItem;

/** @public */
export function provideDataItem(name: string, params: Params): DataItem;

/** @public */
export function provideDataItem(
  name: string,
  connection: ExternalDataItemConnection
): DataItem;

/** @internal */
export function provideDataItem(
  name: string,
  params:
    | ExternalDataItemConnection['get']
    | Params
    | ExternalDataItemConnection
): DataItem {
  assertValidDataIdentifier(name);

  if (typeof params === 'function') {
    return provideDataItem(name, { get: params });
  }

  if ('connection' in params) {
    registerDataClassSchema(name, params.attributes);
    return provideDataItem(name, params.connection);
  }

  return provideExternalDataItem(name, params);
}
