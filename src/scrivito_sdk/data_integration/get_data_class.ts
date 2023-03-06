import { DataClass } from 'scrivito_sdk/data_integration/data_class';
import { DataLocatorError } from 'scrivito_sdk/data_integration/data_locator_error';
import {
  ExternalDataClass,
  isExternalDataClassProvided,
} from 'scrivito_sdk/data_integration/external_data_class';
import {
  ObjDataClass,
  isObjDataClassProvided,
} from 'scrivito_sdk/data_integration/obj_data_class';

export function getDataClass(dataClassName: string): DataClass {
  const dataClass =
    getExternalDataClass(dataClassName) || getObjDataClass(dataClassName);
  if (dataClass) return dataClass;

  throw new DataLocatorError(`No "${dataClassName}" found`);
}

function getExternalDataClass(dataClassName: string) {
  if (isExternalDataClassProvided(dataClassName)) {
    return new ExternalDataClass(dataClassName);
  }
}

function getObjDataClass(dataClassName: string) {
  if (isObjDataClassProvided(dataClassName)) {
    return new ObjDataClass(dataClassName);
  }
}
