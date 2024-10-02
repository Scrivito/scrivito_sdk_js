import mapValues from 'lodash-es/mapValues';

import {
  ArgumentError,
  EmptyContinueIterable,
  isValidInteger,
  transformContinueIterable,
} from 'scrivito_sdk/common';
import { DataQuery, IdBatchCollection, IdBatchQuery } from 'scrivito_sdk/data';
import { DataConnectionError } from 'scrivito_sdk/data_integration';
import { serializeDataAttribute } from 'scrivito_sdk/data_integration/data_attribute';
import {
  DEFAULT_LIMIT,
  NormalizedDataScopeFilters,
  OrderSpec,
  PresentDataScopePojo,
  isOperatorSpec,
} from 'scrivito_sdk/data_integration/data_class';
import { DataClassSchema } from 'scrivito_sdk/data_integration/data_class_schema';
import { DataId, isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import { isExternalDataLoadingDisabled } from 'scrivito_sdk/data_integration/disable_external_data_loading';
import {
  getExternalData,
  setExternalData,
} from 'scrivito_sdk/data_integration/external_data';
import {
  IndexResultCount,
  ResultItem,
  ResultItemData,
  assertValidIndexResultWithUnknownEntries,
  assertValidNumericId,
  assertValidResultItem,
  autocorrectResultItemId,
  getExternalDataConnectionOrThrow,
} from 'scrivito_sdk/data_integration/external_data_connection';
import { queryExternalDataOfflineStore } from 'scrivito_sdk/data_integration/external_data_offline_query';
import { IndexParams } from 'scrivito_sdk/data_integration/index_params';
import { load, loadableWithDefault } from 'scrivito_sdk/loadable';
import { StateContainer, createStateContainer } from 'scrivito_sdk/state';

const writeCounterStates: WriteCounterStates = {};
type WriteCounterStates = Record<string, StateContainer<number>>;

// exported for test purposes only
export const batchCollection = new IdBatchCollection({
  name: 'externaldataquery',
  loadBatch,
  loadOffline: queryExternalDataOfflineStore,
  invalidation: ([dataClass]) =>
    loadableWithDefault(undefined, () =>
      getWriteCounter(dataClass).toString()
    ) || '',
});

export function countExternalData(
  dataClass: string,
  filters: NormalizedDataScopeFilters | undefined,
  search: string | undefined,
  schema: DataClassSchema
): number | null {
  validateFilters(dataClass, filters, schema);

  return (
    batchCollection.getQueryCount([
      dataClass,
      filters,
      search,
      undefined,
      true,
    ]) ?? null
  );
}

export function getExternalDataQuery(
  { _class: dataClass, filters, search, order, limit }: PresentDataScopePojo,
  schema: DataClassSchema
): DataQuery<DataId> {
  if (isExternalDataLoadingDisabled()) return new EmptyContinueIterable();

  validateFilters(dataClass, filters, schema);

  const batchSize = limit ?? DEFAULT_LIMIT;

  const idQuery = new IdBatchQuery((batchNumber) =>
    batchCollection.getBatch(
      [
        dataClass,
        filters,
        search,
        order,
        false, // Never ask the backend about total count when fetching actual result data
      ],
      batchSize,
      batchNumber
    )
  );

  return transformContinueIterable(idQuery, (iterator) =>
    iterator
      .map((idOrItem) => toDataResult(idOrItem, dataClass))
      .takeWhile(({ data }) => data !== undefined)
      .filter(({ data }) => data !== null)
      .map(({ id }) => id)
  );
}

function validateFilters(
  dataClassName: string,
  filters: NormalizedDataScopeFilters | undefined,
  schema: DataClassSchema
) {
  mapValues(filters, (filterValue, filterName) => {
    const operatorSpecs = isOperatorSpec(filterValue)
      ? [filterValue]
      : filterValue.value;

    operatorSpecs.forEach((operatorSpec) => {
      const actualValue = isOperatorSpec(operatorSpec)
        ? operatorSpec.value
        : operatorSpec;
      serializeDataAttribute({
        dataClassName,
        attributeName: filterName,
        value: actualValue,
        schema,
      });
    });
  });
}

export function notifyExternalDataWrite(dataClass: string): void {
  const counterState = getOrCreateWriteCounterState(dataClass);
  const counter = getWriteCounter(dataClass);

  counterState.set(counter + 1);
}

async function loadBatch(
  [dataClass, filters, search, order, count]: [
    string,
    NormalizedDataScopeFilters | undefined,
    string | undefined,
    OrderSpec | undefined,
    boolean | undefined
  ],
  continuation: string | undefined,
  batchSize: number
) {
  const indexCallback = getExternalDataConnectionOrThrow(dataClass).index;

  const result = await indexCallback(
    new IndexParams(continuation, {
      filters,
      search,
      order,
      limit: batchSize,
      count: !!count,
    })
  );

  if (result instanceof DataConnectionError) throw result;

  assertValidIndexResultWithUnknownEntries(result);

  const dataIds = handleResults(result.results, dataClass);

  return {
    continuation: result.continuation ?? undefined,
    results: dataIds,
    total: autocorrectAndValidateCount(result.count),
  };
}

function handleResults(results: unknown[], dataClass: string) {
  return results.map((idOrItem) => {
    if (typeof idOrItem === 'number') {
      assertValidNumericId(idOrItem);
      return handleDataId(dataClass, idOrItem.toString());
    }

    if (typeof idOrItem === 'string') {
      assertValidDataId(idOrItem);
      return handleDataId(dataClass, idOrItem);
    }

    assertValidResultItem(idOrItem);
    return handleResultItem(dataClass, idOrItem);
  });
}

function assertValidDataId(dataId: string): asserts dataId is DataId {
  if (!isValidDataId(dataId)) {
    throw new ArgumentError(
      'Strings in results of an index result must be valid data IDs'
    );
  }
}

function handleDataId(dataClass: string, dataId: string) {
  preloadExternalData(dataClass, dataId);
  return dataId;
}

function handleResultItem(dataClass: string, resultItem: ResultItem) {
  const { _id: id, ...data } = autocorrectResultItemId(resultItem);
  setExternalData(dataClass, id, data);

  return id;
}

function preloadExternalData(dataClass: string, id: string) {
  load(() => getExternalData(dataClass, id));
}

function getWriteCounter(dataClass: string) {
  const counterState = getOrCreateWriteCounterState(dataClass);
  const counter = counterState.get() || 0;

  return counter;
}

function getOrCreateWriteCounterState(dataClass: string) {
  let counterState = writeCounterStates[dataClass];

  if (!counterState) {
    counterState = createStateContainer<number>();
    writeCounterStates[dataClass] = counterState;
  }

  return counterState;
}

interface DataResult {
  id: string;
  data: ResultItemData | null | undefined;
}

function toDataResult(
  idOrItem: DataId | ResultItem,
  dataClass: string
): DataResult {
  if (typeof idOrItem === 'string') {
    return { id: idOrItem, data: getExternalData(dataClass, idOrItem) };
  }

  const { _id: id, ...data } = autocorrectResultItemId(idOrItem);
  return { id, data };
}

function autocorrectAndValidateCount(
  resultCount: IndexResultCount | undefined
): number | undefined {
  if (resultCount === undefined || resultCount === null) return;

  const count = Number(resultCount);
  if (count >= 0 && isValidInteger(count)) return count;

  throw new ArgumentError(
    'Count of an index result must be a non-negative integer'
  );
}
