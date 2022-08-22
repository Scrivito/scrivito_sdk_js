import * as URI from 'urijs';

import { basicObjToDataContext } from 'scrivito_sdk/app_support/basic_obj_to_data_context';
import { isDataClassProvided } from 'scrivito_sdk/app_support/data_class_store';
import {
  ExternalData,
  getExternalDataFrom,
} from 'scrivito_sdk/app_support/external_data_store';
import { externalDataToDataContext } from 'scrivito_sdk/app_support/external_data_to_data_context';
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
import { DataContextContainer } from 'scrivito_sdk/react';

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
  contextContainer: DataContextContainer,
  query?: string
): string | undefined {
  const parameters = getDataContextParameters(objOrLink, contextContainer);

  if (parameters) {
    return URI.buildQuery(
      query ? { ...parameters, ...URI.parseQuery(query) } : parameters
    );
  }

  return query;
}

interface DataContextParameters {
  [parameterName: string]: string;
}

export function getDataContextParameters(
  objOrLink: BasicObj | BasicLink,
  contextContainer: DataContextContainer
): DataContextParameters | undefined {
  const obj = getObj(objOrLink);
  if (!obj) return;

  const objDataClass = obj.dataClass();
  if (!objDataClass) return;

  const dataContext = findDataContext(objDataClass, contextContainer);
  const contextDataClass = getValueFromDataContext('_class', dataContext);

  if (contextDataClass && objDataClass === contextDataClass) {
    const contextDataId = getValueFromDataContext('_id', dataContext);

    if (contextDataId) {
      return { [parameterizeDataClass(objDataClass)]: contextDataId };
    }
  }
}

function findDataContext(
  objDataClass: string,
  contextContainer: DataContextContainer
): DataContext | DataContextCallback {
  const dataContext = contextContainer.dataContext;

  if (
    !getValueFromDataContext('_class', dataContext) ||
    !getValueFromDataContext('_id', dataContext)
  ) {
    const dataContextFromStack = contextContainer.dataStack.find(
      ({ _class: dataClass }) => dataClass === objDataClass
    );

    if (dataContextFromStack) return dataContextFromStack;
  }

  return dataContext;
}

export function getDataContext(
  obj: BasicObj,
  params: QueryParameters
): DataContext | 'loading' | 'unavailable' | undefined {
  const dataClassName = obj.dataClass();
  if (!dataClassName) return;

  const dataId = params[parameterizeDataClass(dataClassName)];
  if (typeof dataId !== 'string' || !dataId) return 'unavailable';

  return isDataClassProvided(dataClassName)
    ? getDataContextFromDataClass(dataClassName, dataId)
    : getDataContextFromObjClass(dataClassName, dataId);
}

function getDataContextFromDataClass(dataClassName: string, dataId: string) {
  return getDataContextFrom<ExternalData>(
    () => getExternalDataFrom(dataClassName, dataId),
    (externalData) =>
      externalDataToDataContext(externalData, dataClassName, dataId)
  );
}

function getDataContextFromObjClass(objClassName: string, objId: string) {
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
