import { ArgumentError } from 'scrivito_sdk/common';
import {
  DataItem,
  DataItemAttributes,
  DataScope,
  DataScopeError,
  DataScopeParams,
  EmptyDataScopePojo,
} from 'scrivito_sdk/data_integration/data_class';

export class EmptyDataScope extends DataScope {
  constructor(private readonly _error?: DataScopeError) {
    super();
  }

  dataClass(): null {
    return null;
  }

  async create(_attributes: DataItemAttributes): Promise<DataItem> {
    throw new ArgumentError('Cannot create items from an empty data scope');
  }

  get(_id: string): null {
    return null;
  }

  take(): DataItem[] {
    return [];
  }

  transform(_params: DataScopeParams): DataScope {
    return new EmptyDataScope();
  }

  filter(_attributeName: string, _value: string): DataScope {
    return new EmptyDataScope();
  }

  search(_text: string): DataScope {
    return new EmptyDataScope();
  }

  objSearch(): undefined {
    return;
  }

  count(): number | null {
    return null;
  }

  getError(): DataScopeError | undefined {
    return this._error;
  }

  /** @internal */
  toPojo(): EmptyDataScopePojo {
    return { _class: null };
  }
}
