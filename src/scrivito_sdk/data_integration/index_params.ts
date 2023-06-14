import {
  DataItemFilters,
  DataScopeParams,
  OrderSpec,
} from 'scrivito_sdk/data_integration/data_class';

export class IndexParams {
  constructor(
    private readonly _continuation: string | undefined,
    private readonly _params: DataScopeParams
  ) {}

  continuation(): string | undefined {
    return this._continuation;
  }

  filters(): DataItemFilters {
    return this._params.filters || {};
  }

  search(): string {
    return this._params.search || '';
  }

  order(): OrderSpec {
    return this._params.order || [];
  }
}
