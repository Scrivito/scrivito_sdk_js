import {
  DataClass,
  DataConnection,
  ExternalDataClass,
  assertValidDataIdentifier,
  buildDataConnection,
  setExternalDataConnection,
} from 'scrivito_sdk/data_integration';

/** @beta */
export function provideDataClass(
  name: string,
  params: { apiPath: string }
): DataClass;

/** @public */
export function provideDataClass(
  name: string,
  params: { connection: DataConnection }
): DataClass;

/** @internal */
export function provideDataClass(
  name: string,
  params: { connection: DataConnection } | { apiPath: string }
): DataClass {
  assertValidDataIdentifier(name);

  const connection =
    'apiPath' in params
      ? buildDataConnection(params.apiPath)
      : params.connection;

  setExternalDataConnection(name, connection);

  return new ExternalDataClass(name);
}
