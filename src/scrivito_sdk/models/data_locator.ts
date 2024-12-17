import {
  DataLocatorFilter,
  DataLocatorJson,
  DataLocatorOperatorFilter,
  DataLocatorQuery,
  DataLocatorValueFilter,
  DataLocatorValueVia,
  DataLocatorValueViaFilter,
  EqOpCode,
  FilterValue,
  OrderByItem,
  ViaRef,
  isDataLocatorOperatorFilter,
  isDataLocatorValueFilter,
} from 'scrivito_sdk/client';
import { isObject } from 'scrivito_sdk/common';

interface DataLocatorParams extends Omit<DataLocatorJson, 'class'> {
  class: string | null;
}

export type DataLocatorTransformFilter =
  | DataLocatorFilter
  | DataLocatorEqFilter;

export interface DataLocatorEqFilter {
  field: string;
  operator: EqOpCode;
  value: FilterValue;
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
  toPojo(): DataLocatorJson | null {
    if (this._class === null) return null;

    if (this._viaRef) {
      return {
        class: this._class,
        field: this._field,
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

export function isDataLocatorValueOrOperatorFilter(
  filter: unknown
): filter is DataLocatorValueFilter | DataLocatorOperatorFilter {
  return (
    isDataLocatorValueFilter(filter) || isDataLocatorOperatorFilter(filter)
  );
}
