import isObject from 'lodash-es/isObject';

import {
  DataLocatorFilter,
  DataLocatorJson,
  DataLocatorOperatorFilter,
  DataLocatorQuery,
  DataLocatorValueFilter,
  DataLocatorValueVia,
  DataLocatorValueViaFilter,
  OpCode,
  OrderByItem,
  ViaRef,
} from 'scrivito_sdk/client';
import { InternalError } from 'scrivito_sdk/common';

interface DataLocatorParams extends Omit<DataLocatorJson, 'class'> {
  class: string | null;
}

type DataLocatorTransformQuery = Array<
  DataLocatorFilter | ConvenienceOperatorFilter
>;

export interface ConvenienceOperatorFilter {
  field: string;
  operator: OpCode;
  value: string;
}

/** @public */
export class DataLocator {
  private readonly _class: string | null;
  private readonly _field?: string;
  private readonly _viaRef?: ViaRef;
  private readonly _query?: DataLocatorQuery;
  private readonly _order_by?: OrderByItem[];
  private readonly _size?: number;

  /** @internal */
  constructor(params: DataLocatorParams) {
    this._class = params.class;
    this._field = params.field;
    this._viaRef = params.via_ref;
    this._query = params.query;
    this._order_by = params.order_by;
    this._size = params.size;
  }

  /** @internal */
  class(): string | null {
    return this._class;
  }

  /** @internal */
  field(): string | undefined {
    return this._field;
  }

  /** @internal */
  viaRef(): ViaRef | undefined {
    const viaRef = this._viaRef;
    if (typeof viaRef === 'boolean') return 'multi';

    return viaRef;
  }

  /** @internal */
  query(): DataLocatorQuery | undefined {
    if (this._viaRef) return;
    if (this._query) return [...this._query];
  }

  /** @internal */
  orderBy(): OrderByItem[] | undefined {
    if (this._viaRef) return;
    if (this._order_by) return [...this._order_by];
  }

  /** @internal */
  size(): number | undefined {
    if (this._viaRef) return;
    return this._size;
  }

  /** @internal */
  transform(params: {
    class?: string | null;
    field?: string | null;
    query?: DataLocatorTransformQuery;
    order_by?: OrderByItem[];
    size?: number | null;
  }): DataLocator {
    if (this._viaRef) throw new InternalError();

    return new DataLocator({
      class: params.class === null ? null : params.class ?? this._class,
      field: params.field === null ? undefined : params.field ?? this._field,
      query: params.query
        ? omitDefaultFilterOperator(params.query)
        : this.query(),
      order_by: params.order_by || this.orderBy(),
      size: params.size === null ? undefined : params.size ?? this._size,
    });
  }

  /** @internal */
  toPojo(): DataLocatorJson | null {
    if (this._class === null) return null;

    if (this._viaRef) {
      return {
        class: this._class,
        via_ref: this._viaRef,
      };
    }

    return {
      class: this._class,
      field: this._field,
      query: this.query(),
      order_by: this.orderBy(),
      size: this._size,
    };
  }
}

function isDataLocatorConvenienceOperatorFilter(
  filter: unknown
): filter is ConvenienceOperatorFilter {
  return (
    isObject(filter) &&
    typeof (filter as ConvenienceOperatorFilter).field === 'string' &&
    (filter as ConvenienceOperatorFilter).operator &&
    typeof (filter as ConvenienceOperatorFilter).value === 'string'
  );
}

export function isDataLocatorOperatorFilter(
  filter: unknown
): filter is DataLocatorOperatorFilter {
  return (
    isDataLocatorConvenienceOperatorFilter(filter) && filter.operator !== 'eq'
  );
}

export function isDataLocatorValueFilter(
  filter: unknown
): filter is DataLocatorValueFilter {
  return (
    isObject(filter) &&
    typeof (filter as DataLocatorValueFilter).field === 'string' &&
    !(filter as DataLocatorOperatorFilter).operator &&
    typeof (filter as DataLocatorValueFilter).value === 'string'
  );
}

export function isDataLocatorValueViaFilter(
  filter: unknown
): filter is DataLocatorValueViaFilter {
  return (
    isObject(filter) &&
    typeof (filter as DataLocatorValueViaFilter).field === 'string' &&
    isDataLocatorValueVia((filter as DataLocatorValueViaFilter).value_via)
  );
}

export function isDataLocatorValueVia(
  valueVia: unknown
): valueVia is DataLocatorValueVia {
  return (
    isObject(valueVia) &&
    typeof (valueVia as DataLocatorValueVia).class === 'string' &&
    typeof (valueVia as DataLocatorValueVia).field === 'string'
  );
}

function omitDefaultFilterOperator(
  query: DataLocatorTransformQuery
): DataLocatorQuery {
  return query.map((filter) => {
    if (
      isDataLocatorConvenienceOperatorFilter(filter) &&
      !isDataLocatorOperatorFilter(filter)
    ) {
      const { field, value } = filter;
      return { field, value };
    }

    return filter;
  });
}
