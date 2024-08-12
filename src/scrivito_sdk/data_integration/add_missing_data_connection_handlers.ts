import { ScrivitoError } from 'scrivito_sdk/common';
import { UnsafeDataConnection } from 'scrivito_sdk/data_integration';

export function addMissingDataConnectionHandlers(
  connection: Partial<UnsafeDataConnection>,
  dataClass: string
): UnsafeDataConnection {
  return {
    get: connection.get || throwMissingCallbackError('get', dataClass),
    update: connection.update || throwMissingCallbackError('update', dataClass),
    index: connection.index || throwMissingCallbackError('index', dataClass),
    create: connection.create || throwMissingCallbackError('create', dataClass),
    delete: connection.delete || throwMissingCallbackError('delete', dataClass),
  };
}

function throwMissingCallbackError(
  callbackName: keyof UnsafeDataConnection,
  dataClass: string
) {
  return () => {
    throw new ScrivitoError(
      `No ${callbackName} callback defined for data class "${dataClass}"`
    );
  };
}
