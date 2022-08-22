import { DataItem } from 'scrivito_sdk/app_support/data_class';
import { isDataClassProvided } from 'scrivito_sdk/app_support/data_class_store';
import { getValueFromDataContext } from 'scrivito_sdk/app_support/data_context';
import { ExternalDataClass } from 'scrivito_sdk/app_support/external_data_class';
import { ObjDataClass } from 'scrivito_sdk/app_support/obj_data_class';
import { useDataContext } from 'scrivito_sdk/react/data_context_container';

/** @alpha */
export function useDataItem(): DataItem | undefined {
  const dataContext = useDataContext();
  if (!dataContext) return;

  const dataClassName = getValueFromDataContext('_class', dataContext);
  const dataId = getValueFromDataContext('_id', dataContext);

  if (dataClassName && dataId) {
    const dataClass = getDataClass(dataClassName);
    return dataClass.get(dataId) || undefined;
  }
}

function getDataClass(dataClassName: string) {
  return isDataClassProvided(dataClassName)
    ? new ExternalDataClass(dataClassName)
    : new ObjDataClass(dataClassName);
}
