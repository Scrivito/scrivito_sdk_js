import { DataItem, getDataClass } from 'scrivito_sdk/app_support/data_class';
import { isDataItemEntry } from 'scrivito_sdk/app_support/data_stack';
import { useDataStackItem } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataItem(): DataItem | undefined {
  const dataStackItem = useDataStackItem();
  if (!dataStackItem || !isDataItemEntry(dataStackItem)) return;

  const { _class: dataClassName, _id: dataId } = dataStackItem;
  const dataClass = getDataClass(dataClassName);

  return dataClass.get(dataId) || undefined;
}
