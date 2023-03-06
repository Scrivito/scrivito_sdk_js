import { isObject } from 'underscore';

import { ArgumentError, transformContinueIterable } from 'scrivito_sdk/common';
import { DataQuery, IdBatchCollection, IdBatchQuery } from 'scrivito_sdk/data';
import { DataItemFilters } from 'scrivito_sdk/data_integration/data_class';
import { DataId, isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import {
  getExternalData,
  setExternalData,
} from 'scrivito_sdk/data_integration/external_data';
import {
  IndexResult,
  ResultItem,
  assertValidResultItem,
  getExternalDataConnectionOrThrow,
} from 'scrivito_sdk/data_integration/external_data_connection';
import { IndexParams } from 'scrivito_sdk/data_integration/index_params';
import { load, loadableWithDefault } from 'scrivito_sdk/loadable';
import { StateContainer, createStateContainer } from 'scrivito_sdk/state';

const writeCounterStates: WriteCounterStates = {};
type WriteCounterStates = Record<string, StateContainer<number>>;

const batchCollection = new IdBatchCollection({
  recordedAs: 'externaldataquery',
  loadBatch,
  invalidation: ([dataClass]) =>
    loadableWithDefault(undefined, () =>
      getWriteCounter(dataClass).toString()
    ) || '',
});

export function getExternalDataQuery(
  dataClass: string,
  filters: DataItemFilters,
  searchText: string
): DataQuery<DataId> {
  const idQuery = new IdBatchQuery((batchNumber) =>
    batchCollection.getBatch(
      [dataClass, filters, searchText],
      -1, // Dummy value for the batch size, since it's ignored anyways
      batchNumber
    )
  );

  return transformContinueIterable(idQuery, (iterator) =>
    iterator
      .map((idOrItem) => toResultItem(idOrItem, dataClass))
      .takeWhile(({ data }) => data !== undefined)
      .filter(({ data }) => data !== null)
      .map(({ id }) => id)
  );
}

export function notifyExternalDataWrite(dataClass: string): void {
  const counterState = getOrCreateWriteCounterState(dataClass);
  const counter = getWriteCounter(dataClass);

  counterState.set(counter + 1);
}

async function loadBatch(
  [dataClass, filters, searchText]: [string, DataItemFilters, string],
  continuation: string | undefined
) {
  const indexCallback = getIndexCallback(dataClass);
  const result = await indexCallback(
    new IndexParams(continuation, filters, searchText)
  );

  assertValidIndexResult(result);

  const dataIds = handleResults(result.results, dataClass);

  return {
    continuation: result.continuation,
    results: dataIds,
  };
}

function assertValidIndexResult(result: unknown) {
  if (!isObject(result)) {
    throw new ArgumentError('An index result must be an object');
  }

  const { results, continuation } = result as IndexResult;

  if (!Array.isArray(results)) {
    throw new ArgumentError('Results of an index result must be an array');
  }

  if (continuation !== undefined) {
    if (typeof continuation !== 'string') {
      throw new ArgumentError(
        'Continuation of an index result must be a string or undefined'
      );
    }

    if (continuation.length === 0) {
      throw new ArgumentError(
        'Continuation of an index result must be a non-empty string or undefined'
      );
    }
  }
}

function handleResults(results: unknown[], dataClass: string) {
  return results.map((idOrItem) => {
    if (typeof idOrItem === 'string') {
      assertValidDataId(idOrItem);
      return handleDataId(dataClass, idOrItem);
    }

    if (isObject(idOrItem)) {
      assertValidResultItem(idOrItem);
      return handleResultItem(dataClass, idOrItem);
    }

    throw new ArgumentError(
      'Results of an index result must contain either strings or objects'
    );
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
  const { id, data } = resultItem;

  if (data) {
    setExternalData(dataClass, id, data);
  } else {
    preloadExternalData(dataClass, id);
  }

  return id;
}

function preloadExternalData(dataClass: string, id: string) {
  load(() => getExternalData(dataClass, id));
}

function getIndexCallback(dataClass: string) {
  const indexCallback = getExternalDataConnectionOrThrow(dataClass).index;

  if (!indexCallback) {
    throw new ArgumentError(
      `No index callback defined for data class "${dataClass}"`
    );
  }

  return indexCallback;
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

function toResultItem(idOrItem: DataId | ResultItem, dataClass: string) {
  return typeof idOrItem === 'string'
    ? {
        id: idOrItem,
        data: getExternalData(dataClass, idOrItem),
      }
    : idOrItem;
}