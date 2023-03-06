import { DataItem } from 'scrivito_sdk/data_integration/data_class';

const globalContext = new Map<string, string>();

export function provideGlobalData(dataItem: DataItem): void {
  const dataClassName = dataItem.dataClass().name();
  const dataItemId = dataItem.id();

  globalContext.set(dataClassName, dataItemId);
}

export function getDefaultItemIdForDataClass(
  dataClassName: string
): string | null {
  return globalContext.get(dataClassName) || null;
}
