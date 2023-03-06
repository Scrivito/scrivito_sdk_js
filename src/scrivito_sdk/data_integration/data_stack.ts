import {
  DataItem,
  DataItemFilters,
} from 'scrivito_sdk/data_integration/data_class';
import {
  DataContext,
  DataContextCallback,
  getValueFromDataContext,
} from 'scrivito_sdk/data_integration/data_context';
import { getDataClass } from 'scrivito_sdk/data_integration/get_data_class';

export type DataStack = Array<DataStackElement>;
export type DataStackElement = ItemElement | ScopeElement;

export interface ItemElement extends DataContext {
  _id: string;
  _class: string;
}

interface ScopeElement {
  _class: string;
  filters: DataItemFilters;
}

export function isItemElement(
  element: DataStackElement
): element is ItemElement {
  return !!(element as ItemElement)._id;
}

export function isScopeElement(
  element: DataStackElement
): element is ScopeElement {
  return !isItemElement(element);
}

export function itemElementToDataItem(
  itemElement: ItemElement
): DataItem | undefined {
  return getDataClass(itemElement._class).get(itemElement._id) || undefined;
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
