import { isObject } from 'underscore';

import { ArgumentError } from 'scrivito_sdk/common';
import { isValidDataIdentifier } from 'scrivito_sdk/data_integration/data_identifier';
import type { Obj, ObjSearch } from 'scrivito_sdk/realm';

/** @beta */
export abstract class DataClass {
  abstract name(): string;
  abstract create(attributes: DataItemAttributes): Promise<DataItem>;
  abstract all(): DataScope;
  abstract get(id: string): DataItem | null;
  abstract getUnchecked(id: string): DataItem;
}

/** @public */
export abstract class DataScope {
  /** @beta */
  abstract dataClass(): DataClass | null;
  /** @beta */
  abstract create(attributes: DataItemAttributes): Promise<DataItem>;
  /** @beta */
  abstract get(id: string): DataItem | null;
  /** @beta */
  abstract take(): DataItem[];
  /** @beta */
  abstract transform(params: DataScopeParams): DataScope;

  /** @public */
  abstract objSearch(): ObjSearch | undefined;

  /** @public */
  isEmpty(): boolean {
    return this.transform({ limit: 1 }).take().length === 0;
  }

  /** @public */
  containsData(): boolean {
    return !this.isEmpty();
  }

  /** @internal */
  abstract toPojo(): DataScopePojo;
}

export type DataItemAttributes = Record<string, unknown>;
export type DataItemFilters = Record<string, string>;

export interface DataScopeParams {
  filters?: DataItemFilters;
  search?: string;
  order?: OrderSpec;
  limit?: number;
}

export const DEFAULT_LIMIT = 20;

export type OrderSpec = Array<[string, 'asc' | 'desc']>;

export type DataScopePojo = PresentDataScopePojo | EmptyDataScopePojo;
export type PresentDataScopePojo = { dataClass: string } & DataScopeParams;
export type EmptyDataScopePojo = { dataClass: null };

export interface DataItemPojo {
  _id: string;
  _class: string;
}

/** @public */
export abstract class DataItem {
  /** @beta */
  abstract id(): string;
  /** @beta */
  abstract dataClass(): DataClass;
  /** @beta */
  abstract obj(): Obj | undefined;
  /** @beta */
  abstract get(attributeName: string): unknown;
  /** @beta */
  abstract update(attributes: DataItemAttributes): Promise<void>;
  /** @beta */
  abstract destroy(): Promise<void>;
}

export function assertValidDataItemAttributes(
  attributes: unknown
): asserts attributes is DataItemAttributes {
  if (!isObject(attributes)) {
    throw new ArgumentError('Data item attributes must be an object');
  }

  if (!Object.keys(attributes as Object).every(isValidDataIdentifier)) {
    throw new ArgumentError(
      'Keys of data item attributes must be valid data identifiers'
    );
  }
}

export function assertNoAttributeFilterConflicts(
  attributes: DataItemAttributes,
  filters: DataItemFilters
): void {
  Object.keys(attributes).forEach((attributeName) => {
    if (filters.hasOwnProperty(attributeName)) {
      const attributeValue = attributes[attributeName];
      const filterValue = filters[attributeName];

      if (attributeValue !== filterValue) {
        throw new ArgumentError(
          `Tried to create ${attributeName}: ${attributeValue} in a context of ${attributeName}: ${filterValue}`
        );
      }
    }
  });
}

export function combineFilters(
  currFilters: DataItemFilters | undefined,
  nextFilters: DataItemFilters | undefined
): DataItemFilters | undefined {
  if (!currFilters) return nextFilters;

  if (nextFilters) {
    assertNoAttributeFilterConflicts(nextFilters, currFilters);
  }

  return { ...currFilters, ...nextFilters };
}

export function combineSearches(
  currSearch: string | undefined,
  nextSearch: string | undefined
): string | undefined {
  return currSearch && nextSearch
    ? `${currSearch} ${nextSearch}`
    : currSearch || nextSearch;
}
