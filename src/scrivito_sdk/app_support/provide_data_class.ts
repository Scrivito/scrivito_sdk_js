import {
  ExternalDataClass,
  ExternalDataConnection,
  setExternalDataConnection,
} from 'scrivito_sdk/data_integration';
import { checkProvideDataClass } from 'scrivito_sdk/realm';

/** @beta */
export function provideDataClass(
  name: string,
  dataClass: { connection: ExternalDataConnection },
  ...excessArgs: never[]
): ExternalDataClass {
  checkProvideDataClass(name, dataClass, ...excessArgs);
  setExternalDataConnection(name, dataClass.connection);

  return new ExternalDataClass(name);
}
