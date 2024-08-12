import { DataScope } from 'scrivito_sdk/data_integration';
import { useData } from 'scrivito_sdk/react/hooks/use_data';

/** @public */
export function useDataScope(): DataScope | undefined {
  const data = useData();
  return data.isDataItem() ? undefined : data;
}
