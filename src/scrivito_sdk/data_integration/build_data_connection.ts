import isObject from 'lodash-es/isObject';

import { JrRestApi } from 'scrivito_sdk/client';
import { ArgumentError } from 'scrivito_sdk/common';
import {
  type DataConnection,
  type IndexResult,
  type ResultItem,
  assertValidIndexResultWithUnknownEntries,
} from 'scrivito_sdk/data_integration/external_data_connection';

export function buildDataConnection(apiPath: string): DataConnection {
  return {
    create: async (data) => {
      const response = await JrRestApi.fetch(apiPath, {
        method: 'post',
        data,
      });
      assertResultDoesNotContainObjectValues(response);
      return response as ResultItem;
    },

    index: async (params) => {
      const response = await JrRestApi.fetch(apiPath, {
        params: {
          ...params.filters(),
          _continuation: params.continuation(),
          _order: params.order().length
            ? params
                .order()
                .map((o) => o.join('.'))
                .join(',')
            : undefined,
          _limit: params.limit().toString(),
          _search: params.search() || undefined,
        },
      });
      assertIndexResponseResultsDoNotContainObjectValues(response);
      return response;
    },

    get: async (id) => {
      const response = await JrRestApi.fetch(`${apiPath}/${id}`);
      if (response !== null) assertResultDoesNotContainObjectValues(response);
      return response;
    },

    update: async (id, data) => {
      const response = await JrRestApi.fetch(`${apiPath}/${id}`, {
        method: 'patch',
        data,
      });
      assertResultDoesNotContainObjectValues(response);
      return response;
    },

    delete: (id) => JrRestApi.fetch(`${apiPath}/${id}`, { method: 'delete' }),
  };
}

function assertResultDoesNotContainObjectValues(result: unknown) {
  if (!isObject(result)) {
    throw new ArgumentError('A result must be an object');
  }

  Object.entries(result).forEach(([key, value]) => {
    if (
      !isSimpleValue(value) &&
      ((Array.isArray(value) && !value.every(isSimpleValue)) ||
        !Array.isArray(value))
    ) {
      throw new ArgumentError(
        `Result values can only be of type string, number, boolean or array of these types. Invalid property: ${key}`
      );
    }
  });
}

function assertIndexResponseResultsDoNotContainObjectValues(
  response: unknown
): asserts response is IndexResult {
  assertValidIndexResultWithUnknownEntries(response);

  response.results.forEach((result) => {
    if (typeof result === 'number' || typeof result === 'string') return;
    assertResultDoesNotContainObjectValues(result);
  });
}

type SimpleValue = string | number | boolean | null | undefined;

function isSimpleValue(value: unknown): value is SimpleValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  );
}
