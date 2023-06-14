import { isObject } from 'underscore';

import { ArgumentError, ScrivitoError } from 'scrivito_sdk/common';
import { isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import {
  DataIdentifier,
  isValidDataIdentifier,
} from 'scrivito_sdk/data_integration/data_identifier';
import { isExternalDataLoadingDisabled } from 'scrivito_sdk/data_integration/disable_external_data_loading';
import { getExternalDataConnectionOrThrow } from 'scrivito_sdk/data_integration/external_data_connection';
import { LoadableCollection } from 'scrivito_sdk/loadable';

export type ExternalData = Record<DataIdentifier, unknown>;

export function setExternalData(
  dataClass: string,
  dataId: string,
  data: ExternalData | null
): void {
  loadableCollection
    .get([dataClass, dataId])
    .set(data ? asExternalData(data) : null);
}

export function getExternalData(
  dataClass: string,
  dataId: string
): ExternalData | null | undefined {
  if (isExternalDataLoadingDisabled()) return undefined;
  return loadableCollection.get([dataClass, dataId]).get();
}

const loadableCollection = new LoadableCollection<
  ExternalData | null,
  [string, string]
>({
  loadElement: ([dataClass, dataId]) => ({
    loader: async () => {
      if (!isValidDataId(dataId)) {
        throw new ArgumentError(`Invalid data ID "${dataId}"`);
      }

      const connection = getExternalDataConnectionOrThrow(dataClass);
      const unknownValue = await connection.get(dataId);

      if (unknownValue === null) return null;
      if (isObject(unknownValue)) return asExternalData(unknownValue);

      throw new ScrivitoError(
        `"GetCallback" of the connection of the data class ${dataClass} returned neither an object nor null`
      );
    },
  }),
});

function asExternalData(data: Object): ExternalData {
  Object.keys(data).forEach((key) => {
    if (!isValidDataIdentifier(key)) {
      throw new ArgumentError(`Invalid data identifier ${key}`);
    }
  });

  return data as ExternalData;
}
