import {
  DataItemPojo,
  DataScopePojo,
} from 'scrivito_sdk/data_integration/data_class';
import {
  DataContext,
  DataContextCallback,
  getValueFromDataContext,
} from 'scrivito_sdk/data_integration/data_context';

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

export function getNextDataStack(
  prevDataStack: DataStack,
  dataContext: DataContext | DataContextCallback
) {
  let dataStack = prevDataStack;

  if (dataContext) {
    const dataClassName = getValueFromDataContext('_class', dataContext);
    const dataId = getValueFromDataContext('_id', dataContext);

    if (dataClassName && dataId) {
      dataStack = [{ _class: dataClassName, _id: dataId }, ...prevDataStack];
    }
  }

  return dataStack;
}
