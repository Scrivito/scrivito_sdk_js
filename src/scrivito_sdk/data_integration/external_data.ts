import { ClientError } from 'scrivito_sdk/client';
import { ArgumentError, isObject } from 'scrivito_sdk/common';
import { isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import { isExternalDataLoadingDisabled } from 'scrivito_sdk/data_integration/disable_external_data_loading';
import { getExternalDataConnectionOrThrow } from 'scrivito_sdk/data_integration/external_data_connection';
import { createLoadableCollection } from 'scrivito_sdk/loadable';
import { DataIdentifier, isValidDataIdentifier } from 'scrivito_sdk/models';

/** @public */
export type ExternalData = Record<DataIdentifier, unknown>;

export function setExternalData(
  dataClass: string,
  dataId: string,
  data: unknown
): void {
  loadableCollection
    .get([dataClass, dataId])
    .set(handleExternalData(data, dataId));
}

export function getExternalData(
  dataClass: string,
  dataId: string
): ExternalData | null | undefined {
  if (isExternalDataLoadingDisabled()) return undefined;
  return loadableCollection.get([dataClass, dataId]).get();
}

export type CollectionData = ExternalData | null;
export type CollectionKey = [string, string];

const loadableCollection = createLoadableCollection<
  CollectionData,
  CollectionKey
>({
  name: 'externaldata',
  loadElement: ([dataClass, dataId]) => ({
    loader: async () => {
      if (!isValidDataId(dataId)) {
        throw new ArgumentError(`Invalid data ID "${dataId}"`);
      }

      const connection = getExternalDataConnectionOrThrow(dataClass);
      let unknownValue;

      try {
        unknownValue = await connection.get(dataId);
      } catch (error) {
        if (error instanceof ClientError && error.httpStatus === 404) {
          return null;
        }

        throw error;
      }

      return handleExternalData(unknownValue, dataId);
    },
  }),
});

export function findInExternalDataOfflineStore(
  selector: (data: CollectionData, key: CollectionKey) => boolean
) {
  return loadableCollection.findValuesInOfflineStore(selector);
}

function handleExternalData(data: unknown, _id: string) {
  if (data === null) return null;

  if (isExternalData(data)) return filterValidDataIdentifiers({ _id, ...data });

  throw new ArgumentError('External data must be an object or null');
}

function isExternalData(data: unknown): data is ExternalData {
  return isObject(data) && typeof data !== 'function' && !Array.isArray(data);
}

function filterValidDataIdentifiers(data: ExternalData) {
  const filteredData: ExternalData = {};

  Object.entries(data).forEach(([key, value]) => {
    if (isValidDataIdentifier(key)) filteredData[key] = value;
  });

  return filteredData;
}
