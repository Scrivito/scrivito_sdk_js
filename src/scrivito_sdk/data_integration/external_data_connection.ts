import { isObject } from 'underscore';

import { ArgumentError, ScrivitoError } from 'scrivito_sdk/common';
import { assertValidDataItemAttributes } from 'scrivito_sdk/data_integration/data_class';
import { DataId, isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import { ExternalData } from 'scrivito_sdk/data_integration/external_data';
import { IndexParams } from 'scrivito_sdk/data_integration/index_params';
import { createStateContainer } from 'scrivito_sdk/state';

/** @beta */
export interface ExternalDataConnection {
  create?: CreateCallback;
  index?: IndexCallback;
  get: GetCallback;
  update?: UpdateCallback;
  delete?: DeleteCallback;
}

export type CreateCallback = (data: ExternalData) => Promise<ResultItem>;
export type IndexCallback = (params: IndexParams) => Promise<IndexResult>;
export type GetCallback = (id: string) => Promise<Object | null>;
export type UpdateCallback = (id: string, data: ExternalData) => Promise<void>;
export type DeleteCallback = (id: string) => Promise<void>;

export interface IndexResult {
  results: Array<DataId | ResultItem>;
  continuation?: string;
}

export interface ResultItem {
  id: DataId;
  data?: ExternalData;
}

export function assertValidResultItem(
  resultItem: unknown
): asserts resultItem is ResultItem {
  if (!isObject(resultItem)) {
    throw new ArgumentError('A result item must be an object');
  }

  const { id, data } = resultItem as ResultItem;

  if (!isValidDataId(id)) {
    throw new ArgumentError(
      '"id" key of a result object must contain a valid data ID'
    );
  }

  if (data !== undefined) {
    assertValidDataItemAttributes(data);
  }
}

const connectionsState =
  createStateContainer<Record<string, ExternalDataConnection>>();

export function setExternalDataConnection(
  name: string,
  connection: ExternalDataConnection
): void {
  connectionsState.set({
    ...connectionsState.get(),
    [name]: connection,
  });
}

export function getExternalDataConnection(
  name: string
): ExternalDataConnection | undefined {
  const connections = connectionsState.get();
  if (connections) return connections[name];
}

export function getExternalDataConnectionNames(): string[] {
  const connections = connectionsState.get();
  return connections ? Object.keys(connections) : [];
}

export function getExternalDataConnectionOrThrow(
  name: string
): ExternalDataConnection {
  const connection = getExternalDataConnection(name);

  if (!connection) {
    throw new ScrivitoError(`Missing data class with name ${name}`);
  }

  return connection;
}
