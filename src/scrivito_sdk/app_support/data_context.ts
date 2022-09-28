import * as URI from 'urijs';

import { basicObjToDataContext } from 'scrivito_sdk/app_support/basic_obj_to_data_context';
import { getDataClass } from 'scrivito_sdk/app_support/data_class';
import {
  DataItemEntry,
  DataStack,
  isDataItemEntry,
} from 'scrivito_sdk/app_support/data_stack';
import { isExternalDataClassProvided } from 'scrivito_sdk/app_support/external_data_class';
import {
  ExternalData,
  getExternalDataFrom,
} from 'scrivito_sdk/app_support/external_data_store';
import { externalDataToDataContext } from 'scrivito_sdk/app_support/external_data_to_data_context';
import { isObjDataClassProvided } from 'scrivito_sdk/app_support/obj_data_class';
import { QueryParameters, underscore } from 'scrivito_sdk/common';
import { loadWithDefault } from 'scrivito_sdk/loadable';
import {
  BasicLink,
  BasicObj,
  currentObjSpaceId,
  getObjFrom,
  objSpaceScope,
  restrictToObjClass,
} from 'scrivito_sdk/models';

export type DataContext = Record<DataContextIdentifier, DataContextValue>;

export type DataContextIdentifier = string;
export type DataContextValue = string;

export type DataContextCallback = (
  identifier: DataContextIdentifier
) => DataContextValue | undefined;

export function getValueFromDataContext(
  identifier: DataContextIdentifier,
  context: DataContext | DataContextCallback
): DataContextValue | undefined {
  return typeof context === 'function'
    ? context(identifier)
    : context[identifier];
}

export function isValidDataContextIdentifier(
  maybeIdentifier: string
): maybeIdentifier is DataContextIdentifier {
  return (
    !!maybeIdentifier.match(/^[a-z](_?[a-z0-9]+)*$/i) &&
    maybeIdentifier.length <= 50
  );
}

export function isValidDataContextValue(
  maybeValue: unknown
): maybeValue is DataContextValue | undefined {
  return typeof maybeValue === 'string' || maybeValue === undefined;
}

export function isValidDataId(
  maybeDataId: unknown
): maybeDataId is DataContextValue {
  return (
    typeof maybeDataId === 'string' &&
    (!!maybeDataId.match(/^\d+$/) || !!maybeDataId.match(/^[a-f0-9]{8,}$/i))
  );
}

export function isValidDataClassName(
  maybeDataClassName: unknown
): maybeDataClassName is DataContextValue {
  return (
    typeof maybeDataClassName === 'string' &&
    !!maybeDataClassName.match(/^[A-Z][a-zA-Z0-9]{0,49}$/)
  );
}

export function getDataContextQuery(
  objOrLink: BasicObj | BasicLink,
  dataStack: DataStack,
  query?: string
): string | undefined {
  const parameters = getDataContextParameters(objOrLink, dataStack);

  if (parameters) {
    return URI.buildQuery(
      query ? Object.assign(parameters, URI.parseQuery(query)) : parameters
    );
  }

  return query;
}

interface DataContextParameters {
  [parameterName: string]: string;
}

export function getDataContextParameters(
  objOrLink: BasicObj | BasicLink,
  dataStack: DataStack
): DataContextParameters | undefined {
  const obj = getObj(objOrLink);
  if (!obj) return;

  const objDataClass = obj.dataClass();
  if (!objDataClass) return;

  const dataContext = findMatchingDataItemEntry(objDataClass, dataStack);
  if (!dataContext) return;

  if (isDataItemEntry(dataContext) && objDataClass === dataContext._class) {
    return { [parameterizeDataClass(objDataClass)]: dataContext._id };
  }
}

export function findMatchingDataItemEntry(
  dataClassName: string,
  dataStack: DataStack
): DataItemEntry | undefined {
  const dataItemEntries = dataStack.filter(isDataItemEntry);
  return dataItemEntries.find((entry) => entry._class === dataClassName);
}

export function getDataContext(
  obj: BasicObj,
  params: QueryParameters
): DataContext | 'loading' | 'unavailable' | undefined {
  const dataClassName = obj.dataClass();
  if (!dataClassName) return;

  const dataId = getDataId(dataClassName, params);
  if (!dataId) return 'unavailable';

  if (isExternalDataClassProvided(dataClassName)) {
    return getDataContextFromExternalData(dataClassName, dataId);
  }

  if (isObjDataClassProvided(dataClassName)) {
    return getDataContextFromObjData(dataClassName, dataId);
  }
}

function getDataId(dataClassName: string, params: QueryParameters) {
  return (
    getDataIdFromParams(dataClassName, params) ||
    getDataIdOfFirstDataItem(dataClassName)
  );
}

function getDataIdFromParams(dataClassName: string, params: QueryParameters) {
  const dataId = params[parameterizeDataClass(dataClassName)];
  if (typeof dataId === 'string' && dataId.length > 0) return dataId;
}

function getDataIdOfFirstDataItem(dataClassName: string) {
  const [firstDataItem] = getDataClass(dataClassName).all().take(1);
  if (firstDataItem) return firstDataItem.id();
}

function getDataContextFromExternalData(dataClassName: string, dataId: string) {
  return getDataContextFrom<ExternalData>(
    () => getExternalDataFrom(dataClassName, dataId),
    (externalData) =>
      externalDataToDataContext(externalData, dataClassName, dataId)
  );
}

function getDataContextFromObjData(objClassName: string, objId: string) {
  return getDataContextFrom<BasicObj>(
    () => getBasicObjFrom(objClassName, objId),
    basicObjToDataContext
  );
}

function getDataContextFrom<T>(
  load: () => T | null,
  map: (data: T) => DataContext | 'loading' | 'unavailable' | undefined
) {
  const data = loadWithDefault('loading', load);

  if (data === 'loading') return 'loading';
  if (!data) return 'unavailable';

  return map(data);
}

function getBasicObjFrom(objClassName: string, objId: string) {
  return getObjFrom(
    objSpaceScope(currentObjSpaceId()).and(restrictToObjClass(objClassName)),
    objId
  );
}

function parameterizeDataClass(dataClass: string): string {
  return `${underscore(dataClass)}_id`;
}

function getObj(objOrLink: BasicObj | BasicLink) {
  if (objOrLink instanceof BasicObj) return objOrLink;

  if (objOrLink.isInternal()) {
    const obj = objOrLink.obj();
    if (obj instanceof BasicObj) return obj;
  }
}
