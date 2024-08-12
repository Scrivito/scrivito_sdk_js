import { ArgumentError } from 'scrivito_sdk/common';
import { addMissingDataConnectionHandlers } from 'scrivito_sdk/data_integration/add_missing_data_connection_handlers';
import {
  ExternalDataClass,
  ExternalDataItem,
} from 'scrivito_sdk/data_integration/external_data_class';
import { setExternalDataConnection } from 'scrivito_sdk/data_integration/external_data_connection';
import { provideGlobalData } from 'scrivito_sdk/data_integration/global_data';
import { IndexParams } from 'scrivito_sdk/data_integration/index_params';
import { registerSingletonDataClass } from 'scrivito_sdk/data_integration/singleton_data_classes';
import { load } from 'scrivito_sdk/loadable';
import { SINGLETON_DATA_ID } from 'scrivito_sdk/models';

import { ExternalData } from './external_data';

type ExternalDataItemGetCallback = () => Promise<unknown>;

type ExternalDataItemUpdateCallback = (data: ExternalData) => Promise<unknown>;

export type ExternalDataItemConnection = {
  get: ExternalDataItemGetCallback;
  update?: ExternalDataItemUpdateCallback;
};

export function provideExternalDataItem(
  name: string,
  connection: ExternalDataItemConnection
): ExternalDataItem {
  const dataClass = new ExternalDataClass(name);

  const updateCallback = connection.update;

  const dataConnection = addMissingDataConnectionHandlers(
    {
      get: async (id) => (isIdValid(id) ? connection.get() : null),
      index: async (params) => readAndFilterItem(params, dataClass),
      ...(updateCallback && {
        update: async (id, data) =>
          isIdValid(id) ? updateCallback(data) : null,
      }),
    },
    name
  );

  setExternalDataConnection(name, dataConnection);

  registerSingletonDataClass(name);

  const dataItem = dataClass.getUnchecked(SINGLETON_DATA_ID);
  provideGlobalData(dataItem);

  return dataItem;
}

function isIdValid(id: string) {
  return id === SINGLETON_DATA_ID;
}

async function readAndFilterItem(
  params: IndexParams,
  dataClass: ExternalDataClass
) {
  const dataItem = await load(() => dataClass.get(SINGLETON_DATA_ID));
  if (!dataItem) return { results: [] };

  const filters = params.filters();
  const doesMatch = await load(() =>
    Object.keys(filters).every((name) => {
      const { value } = filters[name];

      return (
        name === '_id' ||
        (typeof value === 'string' &&
          consideredEqual(dataItem.get(name), value))
      );
    })
  );

  return { results: doesMatch ? [SINGLETON_DATA_ID] : [] };
}

function consideredEqual(itemValue: unknown, filterValue: string) {
  if (itemValue === undefined || itemValue === null) return false;
  if (typeof itemValue === 'string') return itemValue === filterValue;

  if (Array.isArray(itemValue)) {
    return itemValue.some((element) => element === filterValue);
  }

  throw new ArgumentError(`Cannot filter on ${typeof itemValue}`);
}
