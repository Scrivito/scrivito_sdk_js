import { DataItem } from 'scrivito_sdk/data_integration/data_class';
import { ExternalData } from 'scrivito_sdk/data_integration/external_data';
import { ExternalDataClass } from 'scrivito_sdk/data_integration/external_data_class';
import { setExternalDataConnection } from 'scrivito_sdk/data_integration/external_data_connection';
import { provideGlobalData } from 'scrivito_sdk/data_integration/global_data';

export type ExternalDataItemReadCallback = () => Promise<ExternalData>;

const SINGLE_ID = '0';

export function provideExternalDataItem(
  name: string,
  read: ExternalDataItemReadCallback
): DataItem {
  setExternalDataConnection(name, {
    get: async (id: string) => (id === SINGLE_ID ? read() : null),
  });

  const dataClass = new ExternalDataClass(name);
  const dataItem = dataClass.getUnchecked(SINGLE_ID);
  provideGlobalData(dataItem);

  return dataItem;
}
