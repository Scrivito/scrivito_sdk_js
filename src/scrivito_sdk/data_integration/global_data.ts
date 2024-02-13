import { getDataClassOrThrow } from 'scrivito_sdk/data_integration';
import { ExternalDataItem } from 'scrivito_sdk/data_integration/external_data_class';
import { createStateContainer } from 'scrivito_sdk/state';

const globalContextState = createStateContainer<Record<string, string>>();

export function provideGlobalData(dataItem: ExternalDataItem): void {
  const dataClassName = dataItem.dataClass().name();
  const dataItemId = dataItem.id();

  globalContextState.set({
    ...globalContextState.get(),
    [dataClassName]: dataItemId,
  });
}

export function getGlobalDataItems(): ExternalDataItem[] {
  const globalContext = globalContextState.get();

  return globalContext
    ? Object.entries(globalContext)
        .map(([dataClassName, dataId]) =>
          getDataClassOrThrow(dataClassName).get(dataId)
        )
        .filter(
          (maybeDataItem): maybeDataItem is ExternalDataItem => !!maybeDataItem
        )
    : [];
}

export function getDefaultItemIdForDataClass(
  dataClassName: string
): string | null {
  return globalContextState.get()?.[dataClassName] || null;
}
