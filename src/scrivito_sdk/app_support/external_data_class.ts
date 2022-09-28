import {
  DataClass,
  DataItem,
  DataItemAttributes,
  DataScope,
} from 'scrivito_sdk/app_support/data_class';
import { getExternalDataClassConnection } from 'scrivito_sdk/app_support/external_data_class_registry';
import {
  ExternalData,
  getExternalDataFrom,
} from 'scrivito_sdk/app_support/external_data_store';
import { InternalError } from 'scrivito_sdk/common';

export class ExternalDataClass implements DataClass {
  constructor(private readonly _name: string) {}

  name(): string {
    return this._name;
  }

  async create(attributes: DataItemAttributes): Promise<DataItem> {
    return this.all().create(attributes);
  }

  all(): DataScope {
    return new ExternalDataScope(this);
  }

  get(id: string): DataItem | null {
    const externalData = getExternalDataFrom(this._name, id);
    return externalData ? new ExternalDataItem(this, id, externalData) : null;
  }
}

export function isExternalDataClassProvided(name: string): boolean {
  return !!getExternalDataClassConnection(name);
}

export class ExternalDataScope implements DataScope {
  constructor(private readonly _dataClass: DataClass) {}

  dataClass(): DataClass {
    return this._dataClass;
  }

  async create(_attributes: DataItemAttributes): Promise<DataItem> {
    throw new InternalError('Not implemented');
  }

  // Note: This is for now just a stub and will be fully implemented in the future.
  take(_count: number): DataItem[] {
    return [];
  }

  // Note: This is for now just a stub and will be fully implemented in the future.
  filter(_attributeName: string, _value: string): DataScope {
    return this;
  }
}

export class ExternalDataItem implements DataItem {
  constructor(
    private readonly _dataClass: DataClass,
    private readonly _dataId: string,
    private readonly _externalData: ExternalData
  ) {}

  id(): string {
    return this._dataId;
  }

  dataClass(): DataClass {
    return this._dataClass;
  }

  obj(): undefined {
    return;
  }

  get(attributeName: string): string {
    return this._externalData[attributeName] || '';
  }

  update(_attributes: DataItemAttributes): Promise<void> {
    throw new InternalError();
  }

  destroy(): Promise<void> {
    throw new InternalError();
  }
}
