import memoize from 'lodash-es/memoize';

import { addMissingDataConnectionHandlers } from 'scrivito_sdk/data_integration/add_missing_data_connection_handlers';
import { UncheckedDataConnection } from 'scrivito_sdk/data_integration/external_data_connection';

/** Convert a Promise to a DataConnection into a synchronous DataConnection. */
export function anticipatedDataConnection(
  connectionPromise: Promise<Partial<UncheckedDataConnection>>,
  dataClass: string
): UncheckedDataConnection {
  const getCompleteConnection = memoize(async () =>
    addMissingDataConnectionHandlers(await connectionPromise, dataClass)
  );

  return {
    get: async (...args) => (await getCompleteConnection()).get(...args),
    index: async (...args) => (await getCompleteConnection()).index(...args),
    create: async (...args) => (await getCompleteConnection()).create(...args),
    update: async (...args) => (await getCompleteConnection()).update(...args),
    delete: async (...args) => (await getCompleteConnection()).delete(...args),
  };
}
