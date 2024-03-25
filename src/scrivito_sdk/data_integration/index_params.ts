import {
  DataItemFilters,
  DataScopeParams,
  OrderSpec,
} from 'scrivito_sdk/data_integration/data_class';

interface Params extends DataScopeParams {
  limit: number;
  count: boolean;
}

/** @public */
export class IndexParams {
  constructor(
    private readonly _continuation: string | undefined,
    private readonly _params: Params
  ) {}

  continuation(): string | undefined {
    return this._continuation;
  }

  filters(): DataItemFilters {
    return Object.entries(this._params.filters || {}).reduce(
      (filters, [name, value]) =>
        name ? { ...filters, [name]: value } : filters,
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
