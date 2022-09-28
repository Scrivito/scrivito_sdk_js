import { isObject } from 'underscore';

import { isValidDataContextIdentifier } from 'scrivito_sdk/app_support/data_context';
import { getExternalDataClassConnection } from 'scrivito_sdk/app_support/external_data_class_registry';
import { ScrivitoError } from 'scrivito_sdk/common';
import { LoadableCollection } from 'scrivito_sdk/loadable';

export type ExternalData = Record<string, string>;

export function getExternalDataFrom(
  dataClass: string,
  dataId: string
): ExternalData | null {
  return loadableCollection.get([dataClass, dataId]).get() || null;
}

const loadableCollection = new LoadableCollection<
  ExternalData | null,
  [string, string]
>({
  loadElement: ([dataClass, dataId]) => ({
    loader: async () => {
      const connection = getExternalDataClassConnection(dataClass);
      if (!connection) {
        throw new ScrivitoError(`Missing data class with name ${dataClass}`);
      }

      const returnValue = await connection.get(dataId);

      if (returnValue === null) return null;
      if (isObject(returnValue)) return toExternalData(returnValue);

      throw new ScrivitoError(
        `"GetCallback" of the connection of the data class ${dataClass} returned neither an object nor null`
      );
    },
  }),
});

function toExternalData(object: Object) {
  const externalData: ExternalData = {};

  let identifier: keyof typeof object;

  for (identifier in object) {
    if (isValidDataContextIdentifier(identifier)) {
      const value = object[identifier];

      if (typeof value === 'string') {
        externalData[identifier] = value;
      }
    }
  }

  return externalData;
}
