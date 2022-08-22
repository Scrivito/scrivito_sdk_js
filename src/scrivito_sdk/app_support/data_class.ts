import { isObject } from 'underscore';
import type { Obj } from 'scrivito_sdk/realm';

export interface DataClass {
  name(): string;
  get(id: string): DataItem | null;
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
    isObject(maybeDataItem) &&
    typeof (maybeDataItem as DataItem).id === 'function' &&
    typeof (maybeDataItem as DataItem).id() === 'string' &&
    typeof (maybeDataItem as DataItem).dataClass === 'function' &&
    isDataClass((maybeDataItem as DataItem).dataClass())
  );
}

function isDataClass(maybeDataClass: unknown): maybeDataClass is DataClass {
  return (
    isObject(maybeDataClass) &&
    typeof (maybeDataClass as DataClass).name === 'function' &&
    typeof (maybeDataClass as DataClass).name() === 'string'
  );
}
