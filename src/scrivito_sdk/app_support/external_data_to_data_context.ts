import { DataContext } from 'scrivito_sdk/app_support/data_context';
import { ExternalData } from 'scrivito_sdk/app_support/external_data_store';

export function externalDataToDataContext(
  externalData: ExternalData,
  dataClassName: string,
  dataId: string
): DataContext {
  return {
    _class: dataClassName,
    _id: dataId,
    ...externalData,
  };
}
