import { basicObjToDataContext } from 'scrivito_sdk/data_integration/basic_obj_to_data_context';
import { DataItem } from 'scrivito_sdk/data_integration/data_class';
import {
  DataContext,
  DataContextCallback,
} from 'scrivito_sdk/data_integration/data_context';
import { getExternalData } from 'scrivito_sdk/data_integration/external_data';
import { ExternalDataItem } from 'scrivito_sdk/data_integration/external_data_class';
import { externalDataToDataContext } from 'scrivito_sdk/data_integration/external_data_to_data_context';
import { ObjDataItem } from 'scrivito_sdk/data_integration/obj_data_class';
import { BasicObj } from 'scrivito_sdk/models';
import { unwrapAppClass } from 'scrivito_sdk/realm';

export function toDataContext(
  maybeDataContext: DataContext | DataContextCallback | DataItem | BasicObj
): DataContext | DataContextCallback | undefined {
  if (maybeDataContext instanceof DataItem) {
    return dataItemToDataContext(maybeDataContext);
  }

  if (maybeDataContext instanceof BasicObj) {
    return basicObjToDataContext(maybeDataContext);
  }

  return maybeDataContext;
}

function dataItemToDataContext(dataItem: DataItem) {
  if (dataItem instanceof ExternalDataItem) {
    return externalDataItemToDataContext(dataItem);
  }

  if (dataItem instanceof ObjDataItem) {
    return objDataItemToDataContext(dataItem);
  }
}

function objDataItemToDataContext(dataItem: ObjDataItem) {
  const obj = dataItem.obj();
  return obj ? basicObjToDataContext(unwrapAppClass(obj)) : undefined;
}

function externalDataItemToDataContext(dataItem: ExternalDataItem) {
  const dataClassName = dataItem.dataClass().name();
  const dataId = dataItem.id();
  const externalData = getExternalData(dataClassName, dataId);

  if (externalData) {
    return externalDataToDataContext(externalData, dataClassName, dataId);
  }
}
