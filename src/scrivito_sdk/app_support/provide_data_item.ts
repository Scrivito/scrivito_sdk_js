import {
  DataItem,
  ExternalDataItemReadCallback,
  provideExternalDataItem,
} from 'scrivito_sdk/data_integration';
import { checkProvideDataItem } from 'scrivito_sdk/realm';

/** @public */
export function provideDataItem(
  name: string,
  read: ExternalDataItemReadCallback,
  ...excessArgs: never[]
): DataItem {
  checkProvideDataItem(name, read, ...excessArgs);
  return provideExternalDataItem(name, read);
}
