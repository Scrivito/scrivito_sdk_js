import {
  ExternalDataClass,
  ExternalDataItem,
  ExternalDataScope,
  isExternalDataClassProvided,
} from 'scrivito_sdk/app_support/external_data_class';
import {
  ObjDataClass,
  ObjDataItem,
  ObjDataScope,
  isObjDataClassProvided,
} from 'scrivito_sdk/app_support/obj_data_class';
import { DataLocatorError } from 'scrivito_sdk/models';
import type { Obj } from 'scrivito_sdk/realm';

export interface DataClass {
  name(): string;
  create(attributes: DataItemAttributes): Promise<DataItem>;
  all(): DataScope;
  get(id: string): DataItem | null;
}

export interface DataScope {
  dataClass(): DataClass;
  create(attributes: DataItemAttributes): Promise<DataItem>;
  take(count: number): DataItem[];
  filter(attributeName: string, value: string): DataScope;
}

export type DataItemAttributes = Record<string, string>;

export interface DataItem {
  id(): string;
  dataClass(): DataClass;
  obj(): Obj | undefined;
  get(attributeName: string): string;
  update(attributes: DataItemAttributes): Promise<void>;
  destroy(): Promise<void>;
}

export function isDataItem(maybeDataItem: unknown): maybeDataItem is DataItem {
  return (
    maybeDataItem instanceof ObjDataItem ||
    maybeDataItem instanceof ExternalDataItem
  );
}

export function isDataScope(
  maybeDataScope: unknown
): maybeDataScope is DataScope {
  return (
    maybeDataScope instanceof ObjDataScope ||
    maybeDataScope instanceof ExternalDataScope
  );
}

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
