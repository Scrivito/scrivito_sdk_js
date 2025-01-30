import { FilterValue, OpCode } from 'scrivito_sdk/client';
import {
  FilterOperator,
  NormalizedDataScopeParams,
  OrderSpec,
  isOperatorSpec,
} from 'scrivito_sdk/data_integration/data_class';

interface Params extends NormalizedDataScopeParams {
  limit: number;
  count: boolean;
}

export interface FilterSpec {
  operator: FilterOperator;
  opCode: OpCode;
  value: FilterValue;
}

interface AndFilterSpec {
  operator: 'and';
  value: FilterSpec[];
}

export type IndexParamsFilters = Record<string, FilterSpec | AndFilterSpec>;

/** @public */
export class DataConnectionIndexParams {
  constructor(
    private readonly _continuation: string | undefined,
    private readonly _params: Params
  ) {}

  continuation(): string | undefined {
    return this._continuation;
  }

  filters(): IndexParamsFilters {
    return Object.entries(this._params.filters || {}).reduce(
      (filters, [name, operatorSpec]) => {
        if (!name) return filters;

        return {
          ...filters,
          [name]: isOperatorSpec(operatorSpec)
            ? {
                ...operatorSpec,
                opCode: operatorToOpCode[operatorSpec.operator],
              }
            : {
                operator: 'and',
                value: operatorSpec.value.map((spec) => ({
                  ...spec,
                  opCode: operatorToOpCode[spec.operator],
                })),
              },
        };
      },
      {}
    );
  }

  search(): string {
    return this._params.search || '';
  }

  order(): OrderSpec {
    return (this._params.order || []).filter(
      ([attributeName]) => !!attributeName
    );
  }

  limit(): number {
    return this._params.limit;
  }

  includeCount(): boolean {
    return this._params.count;
  }
}

export const operatorToOpCode: Record<FilterOperator, OpCode> = {
  equals: 'eq',
  notEquals: 'neq',
  isGreaterThan: 'gt',
  isLessThan: 'lt',
  isGreaterThanOrEquals: 'gte',
  isLessThanOrEquals: 'lte',
};
