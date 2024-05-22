import type { ApiClient } from 'scrivito_sdk/client';
import {
  DataClass,
  DataConnection,
  ExternalDataClass,
  assertValidDataIdentifier,
  createStandardApiConnection,
  setExternalDataConnection,
} from 'scrivito_sdk/data_integration';

/** @beta */
export function provideDataClass(
  name: string,
  params: { restApi: string | ApiClient }
): DataClass;

/** @public */
export function provideDataClass(
  name: string,
  params: { connection: DataConnection }
): DataClass;

/** @internal */
export function provideDataClass(
  name: string,
  params: { connection: DataConnection } | { restApi: string | ApiClient }
): DataClass {
  assertValidDataIdentifier(name);

  if ('restApi' in params) {
    return provideDataClass(name, {
      connection: createStandardApiConnection(params.restApi),
    });
  }

  setExternalDataConnection(name, params.connection);

  return new ExternalDataClass(name);
}
