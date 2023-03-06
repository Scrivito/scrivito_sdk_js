import { DataItemFilters } from 'scrivito_sdk/data_integration/data_class';

export class IndexParams {
  constructor(
    private readonly _continuation: string | undefined,
    private readonly _filters: DataItemFilters,
    private readonly _searchText: string
  ) {}

  continuation(): string | undefined {
    return this._continuation;
  }

  filters(): DataItemFilters {
    return this._filters;
  }

  search(): string {
    return this._searchText;
  }
}
