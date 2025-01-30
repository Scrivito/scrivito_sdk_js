import { ArgumentError } from 'scrivito_sdk/common';
import { registerExternalDataClass } from 'scrivito_sdk/data_integration';
import { throwMissingCallbackError } from 'scrivito_sdk/data_integration/add_missing_data_connection_handlers';
import { LazyAsyncDataClassSchema } from 'scrivito_sdk/data_integration/data_class_schema';
import { ExternalData } from 'scrivito_sdk/data_integration/external_data';
import { ExternalDataClass } from 'scrivito_sdk/data_integration/external_data_class';
import { UncheckedDataConnection } from 'scrivito_sdk/data_integration/external_data_connection';
import { provideGlobalData } from 'scrivito_sdk/data_integration/global_data';
import { DataConnectionIndexParams } from 'scrivito_sdk/data_integration/index_params';
import { registerSingletonDataClass } from 'scrivito_sdk/data_integration/singleton_data_classes';
import { load } from 'scrivito_sdk/loadable';

export const SINGLETON_DATA_ID = '0';

type ExternalDataItemGetCallback = () => Promise<unknown>;

type ExternalDataItemUpdateCallback = (data: ExternalData) => Promise<unknown>;

export type ExternalDataItemConnection = {
  get: ExternalDataItemGetCallback;
  update?: ExternalDataItemUpdateCallback;
};

export async function provideExternalDataItem(
  dataClass: ExternalDataClass,
  paramsPromise: Promise<{
    connection: Promise<ExternalDataItemConnection>;
    schema: LazyAsyncDataClassSchema;
  }>
): Promise<void> {
  const name = dataClass.name();

  const { connection, schema } = await paramsPromise;

  const getCallback = async () => (await connection).get();

  const updateCallback = async (data: ExternalData) => {
    const { update } = await connection;
    if (update) return update(data);
    throwMissingCallbackError('update', name)();
  };

  const dataConnection: Partial<UncheckedDataConnection> = {
    get: async (id) => (isSingletonDataId(id) ? getCallback() : null),
    index: async (params) => readAndFilterItem(params, dataClass),
    ...(updateCallback && {
      update: async (id, data) =>
        isSingletonDataId(id) ? updateCallback(data) : null,
    }),
  };

  registerExternalDataClass(
    name,
    (async () => ({
      connection: Promise.resolve(dataConnection),
      schema,
    }))()
  );

  registerSingletonDataClass(name);
  provideGlobalData(dataClass.getUnchecked(SINGLETON_DATA_ID));
}

function isSingletonDataId(id: string) {
  return id === SINGLETON_DATA_ID;
}

async function readAndFilterItem(
  params: DataConnectionIndexParams,
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
