import { DataScope, getDataClass } from 'scrivito_sdk/app_support/data_class';
import { isDataScopeEntry } from 'scrivito_sdk/app_support/data_stack';
import { useDataStackItem } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataScope(): DataScope | undefined {
  const dataStackItem = useDataStackItem();
  if (!dataStackItem || !isDataScopeEntry(dataStackItem)) return;

  return getDataClass(dataStackItem._class).all();
}
