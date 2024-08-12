import { DataItem, deserializeDataItem } from 'scrivito_sdk/data_integration';
import { useClosestSingleItemDataStackElement } from 'scrivito_sdk/react/data_context_container';

/** @public */
export function useDataItem(): DataItem | undefined {
  const stackElement = useClosestSingleItemDataStackElement();
  if (stackElement) return deserializeDataItem(stackElement);
}
