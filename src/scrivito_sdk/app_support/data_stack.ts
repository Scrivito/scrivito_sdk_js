import { DataContext } from 'scrivito_sdk/app_support/data_context';

export type DataStack = Array<DataStackItem>;
export type DataStackItem = DataItemEntry | DataScopeEntry;

export interface DataItemEntry extends DataContext {
  _id: string;
  _class: string;
}

interface DataScopeEntry {
  _class: string;
}

export function isDataItemEntry(
  dataStackItem: DataStackItem
): dataStackItem is DataItemEntry {
  return !!(dataStackItem as DataItemEntry)._id;
}

export function isDataScopeEntry(
  dataStackItem: DataStackItem
): dataStackItem is DataScopeEntry {
  return !isDataItemEntry(dataStackItem);
}
