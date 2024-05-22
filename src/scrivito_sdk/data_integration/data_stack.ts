import {
  DataItem,
  DataItemPojo,
  DataScope,
  DataScopePojo,
} from 'scrivito_sdk/data_integration/data_class';
import { EmptyDataScope } from 'scrivito_sdk/data_integration/empty_data_scope';
import { getDataClassOrThrow } from 'scrivito_sdk/data_integration/get_data_class';

export type DataStack = Array<DataStackElement>;
export type DataStackElement = DataItemPojo | DataScopePojo;

export function isDataItemPojo(
  element: DataStackElement
): element is DataItemPojo {
  return !!(element as DataItemPojo)._id;
}

export function isDataScopePojo(
  element: DataStackElement
): element is DataScopePojo {
  return !isDataItemPojo(element);
}

export function deserializeDataStackElement(
  element: DataStackElement,
  attributeName?: string
): DataScope | DataItem | undefined {
  return isDataItemPojo(element)
    ? deserializeDataItem(element)
    : deserializeDataScope(element, attributeName);
}

export function findItemInDataStack(
  dataClassName: string,
  dataStack: DataStack
): DataItemPojo | undefined {
  const itemElements = dataStack.filter(isDataItemPojo);
  return itemElements.find((element) => element._class === dataClassName);
}

export function findScopeInDataStack(
  dataClassName: string,
  dataStack: DataStack
): DataScopePojo | undefined {
  const element = dataStack.find((el) => el._class === dataClassName);
  if (element && isDataScopePojo(element)) return element;
}

function deserializeDataScope(
  { _class: dataClassName, ...dataScopeParams }: DataScopePojo,
  attributeName?: string
): DataScope | undefined {
  if (dataClassName) {
    const dataClass = getDataClassOrThrow(dataClassName);

    if ('isEmpty' in dataScopeParams) {
      return new EmptyDataScope({
        dataClass,
        isDataItem: dataScopeParams.isDataItem,
      });
    }

    const dataScope = attributeName
      ? dataClass.forAttribute(attributeName)
      : dataClass.all();

    return dataScope.transform(dataScopeParams);
  }
}

function deserializeDataItem({
  _class: dataClass,
  _id: dataId,
}: DataItemPojo): DataItem | undefined {
  return getDataClassOrThrow(dataClass).get(dataId) || undefined;
}
