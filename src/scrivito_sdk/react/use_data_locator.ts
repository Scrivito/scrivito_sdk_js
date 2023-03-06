import {
  DataItem,
  DataScope,
  applyDataLocator,
} from 'scrivito_sdk/data_integration';
import { useDataStack } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataLocator(
  dataLocator: unknown
): DataScope | DataItem | null {
  const dataStack = useDataStack();
  return applyDataLocator(dataStack, dataLocator);
}
