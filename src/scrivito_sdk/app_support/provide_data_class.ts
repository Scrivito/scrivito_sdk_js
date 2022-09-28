import { ExternalDataClass } from 'scrivito_sdk/app_support/external_data_class';
import {
  DataClassConnection,
  registerExternalDataClassConnection,
} from 'scrivito_sdk/app_support/external_data_class_registry';
import { checkProvideDataClass } from 'scrivito_sdk/realm';

/** @beta */
export function provideDataClass(
  name: string,
  dataClass: { connection: DataClassConnection },
  ...excessArgs: never[]
): ExternalDataClass {
  checkProvideDataClass(name, dataClass, ...excessArgs);
  registerExternalDataClassConnection(name, dataClass.connection);

  return new ExternalDataClass(name);
}
