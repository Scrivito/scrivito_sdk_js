import { isObject } from 'underscore';

import { ArgumentError } from 'scrivito_sdk/common';
import { isValidDataIdentifier } from 'scrivito_sdk/data_integration/data_identifier';
import type { Obj } from 'scrivito_sdk/realm';

export abstract class DataClass {
  abstract name(): string;
  abstract create(attributes: DataItemAttributes): Promise<DataItem>;
  abstract all(): DataScope;
  abstract get(id: string): DataItem | null;
  abstract getUnchecked(id: string): DataItem;
}

export abstract class DataScope {
  abstract dataClass(): DataClass;
  abstract create(attributes: DataItemAttributes): Promise<DataItem>;
  abstract get(id: string): DataItem | null;
  abstract take(count: number): DataItem[];
  abstract filter(attributeName: string, value: string): DataScope;
  abstract search(text: string): DataScope;

  /** @internal */
  abstract getFilters(): DataItemFilters;
}

export type DataItemAttributes = Record<string, unknown>;
export type DataItemFilters = Record<string, string>;

export abstract class DataItem {
  abstract id(): string;
  abstract dataClass(): DataClass;
  abstract obj(): Obj | undefined;
  abstract get(attributeName: string): unknown;
  abstract update(attributes: DataItemAttributes): Promise<void>;
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

export function combineSearches(
  currentSearchText: string | undefined,
  newSearchText: string
): string {
  return currentSearchText
    ? `${currentSearchText} ${newSearchText}`
    : newSearchText;
}
