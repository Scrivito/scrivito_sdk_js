import {
  ArgumentError,
  extractFromIterator,
  transformContinueIterable,
} from 'scrivito_sdk/common';
import {
  DataClass,
  DataItem,
  DataItemAttributes,
  DataItemFilters,
  DataScope,
  assertNoAttributeFilterConflicts,
  assertValidDataItemAttributes,
  combineSearches,
} from 'scrivito_sdk/data_integration/data_class';
import {
  getExternalData,
  setExternalData,
} from 'scrivito_sdk/data_integration/external_data';
import {
  assertValidResultItem,
  getExternalDataConnection,
} from 'scrivito_sdk/data_integration/external_data_connection';
import {
  getExternalDataQuery,
  notifyExternalDataWrite,
} from 'scrivito_sdk/data_integration/external_data_query';
import { load } from 'scrivito_sdk/loadable';

export class ExternalDataClass extends DataClass {
  constructor(private readonly _name: string) {
    super();
  }

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
    return getExternalData(this._name, id)
      ? new ExternalDataItem(this, id)
      : null;
  }

  getUnchecked(id: string): DataItem {
    return new ExternalDataItem(this, id);
  }
}

export function isExternalDataClassProvided(name: string): boolean {
  return !!getExternalDataConnection(name);
}

export class ExternalDataScope extends DataScope {
  constructor(
    private readonly _dataClass: DataClass,
    private readonly _filters: DataItemFilters = {},
    private readonly _searchText?: string
  ) {
    super();
  }

  dataClass(): DataClass {
    return this._dataClass;
  }

  async create(attributes: DataItemAttributes): Promise<DataItem> {
    assertValidDataItemAttributes(attributes);
    assertNoAttributeFilterConflicts(attributes, this._filters);

    const createCallback = this.getCreateCallback();
    const dataForCallback = { ...attributes, ...this._filters };
    const result = await createCallback(dataForCallback);
    assertValidResultItem(result);

    const dataClassName = this.dataClassName();
    const { id, data: dataFromCallback } = result;
    setExternalData(dataClassName, id, dataFromCallback || dataForCallback);
    notifyExternalDataWrite(dataClassName);

    return new ExternalDataItem(this._dataClass, id);
  }

  get(id: string): DataItem | null {
    const dataItem = this._dataClass.get(id);
    if (!dataItem) return null;

    const hasConflict = Object.keys(this._filters).some((attributeName) => {
      const dataItemValue = dataItem.get(attributeName);
      const filterValue = this._filters[attributeName];

      return dataItemValue !== filterValue;
    });

    return hasConflict ? null : dataItem;
  }

  take(count: number): DataItem[] {
    return extractFromIterator(this.getIterator(), count);
  }

  filter(attributeName: string, value: string): DataScope {
    const patch = { [attributeName]: value };
    assertNoAttributeFilterConflicts(patch, this._filters);

    return new ExternalDataScope(this._dataClass, {
      ...this._filters,
      ...patch,
    });
  }

  search(text: string): DataScope {
    return new ExternalDataScope(
      this._dataClass,
      { ...this._filters },
      combineSearches(this._searchText, text)
    );
  }

  /** @internal */
  getFilters(): DataItemFilters {
    return this._filters;
  }

  private dataClassName() {
    return this._dataClass.name();
  }

  private getCreateCallback() {
    const dataClassName = this.dataClassName();
    const createCallback = getConnection(dataClassName).create;

    if (!createCallback) {
      throw new ArgumentError(
        `No create callback defined for data class "${dataClassName}"`
      );
    }

    return createCallback;
  }

  private getIterator() {
    const externalDataQuery = getExternalDataQuery(
      this.dataClassName(),
      this._filters,
      this._searchText || ''
    );

    return transformContinueIterable(externalDataQuery, (iterator) =>
      iterator.map((dataId) => new ExternalDataItem(this._dataClass, dataId))
    ).iterator();
  }
}

export class ExternalDataItem extends DataItem {
  constructor(
    private readonly _dataClass: DataClass,
    private readonly _dataId: string
  ) {
    super();
  }

  id(): string {
    return this._dataId;
  }

  dataClass(): DataClass {
    return this._dataClass;
  }

  obj(): undefined {
    return;
  }

  get(attributeName: string): unknown {
    const externalData = this.getExternalData();

    return externalData?.hasOwnProperty(attributeName)
      ? externalData[attributeName]
      : null;
  }

  async update(attributes: DataItemAttributes): Promise<void> {
    assertValidDataItemAttributes(attributes);

    const externalData = await load(() => this.getExternalData());
    if (!externalData) {
      throw new ArgumentError(`Missing data with ID ${this._dataId}`);
    }

    const updateCallback = this.getUpdateCallback();
    await updateCallback(this._dataId, attributes);

    setExternalData(this._dataClass.name(), this._dataId, {
      ...externalData,
      ...attributes,
    });

    this.notifyWrite();
  }

  async destroy(): Promise<void> {
    const deleteCallback = this.getDeleteCallback();
    await deleteCallback(this._dataId);

    setExternalData(this.dataClassName(), this._dataId, null);

    this.notifyWrite();
  }

  private getExternalData() {
    return getExternalData(this.dataClassName(), this._dataId);
  }

  private getUpdateCallback() {
    const updateCallback = this.getConnection().update;

    if (!updateCallback) {
      throw new ArgumentError(
        `No update callback defined for data class "${this.dataClassName()}"`
      );
    }

    return updateCallback;
  }

  private getDeleteCallback() {
    const deleteCallback = this.getConnection().delete;

    if (!deleteCallback) {
      throw new ArgumentError(
        `No delete callback defined for data class "${this.dataClassName()}"`
      );
    }

    return deleteCallback;
  }

  private getConnection() {
    return getConnection(this.dataClassName());
  }

  private dataClassName() {
    return this._dataClass.name();
  }

  private notifyWrite() {
    notifyExternalDataWrite(this.dataClassName());
  }
}

function getConnection(dataClassName: string) {
  const connection = getExternalDataConnection(dataClassName);

  if (!connection) {
    throw new ArgumentError(
      `No connection provided for data class "${dataClassName}"`
    );
  }

  return connection;
}
