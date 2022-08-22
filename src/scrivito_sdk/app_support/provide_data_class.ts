import {
  DataClassConnection,
  storeDataClassConnection,
} from 'scrivito_sdk/app_support/data_class_store';
import { checkProvideDataClass } from 'scrivito_sdk/realm';

/** @alpha */
export function provideDataClass(
  name: string,
  dataClass: { connection: DataClassConnection },
  ...excessArgs: never[]
): void {
  checkProvideDataClass(name, dataClass, ...excessArgs);
  storeDataClassConnection(name, dataClass.connection);
}
