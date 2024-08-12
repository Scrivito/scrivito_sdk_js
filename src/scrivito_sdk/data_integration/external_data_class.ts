import isEmpty from 'lodash-es/isEmpty';
import mapValues from 'lodash-es/mapValues';

import { ClientError } from 'scrivito_sdk/client';
import {
  ArgumentError,
  InternalError,
  extractFromIterator,
  transformContinueIterable,
} from 'scrivito_sdk/common';
import {
  deserializeDataAttribute,
  serializeDataAttribute,
} from 'scrivito_sdk/data_integration/data_attribute';
import {
  DEFAULT_LIMIT,
  DataClass,
  DataItem,
  DataItemAttributes,
  DataScope,
  DataScopeError,
  DataScopeParams,
  NormalizedDataScopeParams,
  PresentDataScopePojo,
  assertValidDataItemAttributes,
  combineFilters,
  combineSearches,
  itemIdFromFilters,
} from 'scrivito_sdk/data_integration/data_class';
import {
  DataClassSchema,
  getDataClassSchema,
} from 'scrivito_sdk/data_integration/data_class_schema';
import {
  ExternalData,
  getExternalData,
  setExternalData,
} from 'scrivito_sdk/data_integration/external_data';
import {
  assertValidResultItem,
  autocorrectResultItemId,
  getExternalDataConnection,
  getExternalDataConnectionNames,
} from 'scrivito_sdk/data_integration/external_data_connection';
import {
  DataConnectionError,
  countExternalData,
  getExternalDataQuery,
  notifyExternalDataWrite,
} from 'scrivito_sdk/data_integration/external_data_query';
import { load } from 'scrivito_sdk/loadable';

/** @beta */
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
      ? ExternalDataItem.build(this, id)
      : null;
  }

  getUnchecked(id: string): ExternalDataItem {
    return ExternalDataItem.buildUnchecked(this, id);
  }

  /** @internal */
  forAttribute(attributeName: string): DataScope {
    return new ExternalDataScope(this, attributeName);
  }
}

export function isExternalDataClassProvided(name: string): boolean {
  return !!getExternalDataConnection(name);
}

export function allExternalDataClasses(): ExternalDataClass[] {
  return getExternalDataConnectionNames().map(
    (name) => new ExternalDataClass(name)
  );
}

/** @beta */
export class ExternalDataScope extends DataScope {
  constructor(
    private readonly _dataClass: DataClass,
    private readonly _attributeName?: string,
    private readonly _params: NormalizedDataScopeParams = {}
  ) {
    super();
  }

  dataClass(): DataClass {
    return this._dataClass;
  }

  dataClassName(): string {
    return this._dataClass.name();
  }

  async create(attributes: DataItemAttributes): Promise<DataItem> {
    this.assertNoIdFilter();
    assertValidDataItemAttributes(attributes);

    const { filters } = this._params;
    const dataClassName = this.dataClassName();
    const schema = await loadSchemaOrThrow(dataClassName);

    const serializedAttributes = serializeAttributes(
      dataClassName,
      attributes,
      schema
    );

    const dataForCallback = {
      ...serializedAttributes,
      ...this.attributesFromFilters(filters),
    };

    const createCallback = getConnection(dataClassName).create;
    const resultItem = await createCallback(dataForCallback);
    assertValidResultItem(resultItem);

    const { _id: id, ...dataFromCallback } =
      autocorrectResultItemId(resultItem);

    setExternalData(
      dataClassName,
      id,
      (!isEmpty(dataFromCallback) && dataFromCallback) || dataForCallback
    );

    notifyExternalDataWrite(dataClassName);

    return ExternalDataItem.buildWithLoadedSchema(this._dataClass, id, schema);
  }

  get(id: string): DataItem | null {
    const { filters, search } = this._params;
    if (!search && !filters) return this._dataClass.get(id);

    const idFromFilters = this.itemIdFromFilters();
    if (idFromFilters && this.hasSingleFilter()) {
      return idFromFilters === id ? this._dataClass.get(id) : null;
    }

    return this.transform({ filters: { _id: id }, limit: 1 }).take()[0] || null;
  }

  dataItem(): DataItem | null {
    const id = this.itemIdFromFilters();
    return id ? this.get(id) : null;
  }

  isDataItem(): boolean {
    return !!this.itemIdFromFilters();
  }

  attributeName(): string | null {
    return this._attributeName || null;
  }

  take(): DataItem[] {
    const schema = getDataClassSchema(this.dataClassName());
    if (!schema) return [];

    const id = this.itemIdFromFilters();
    if (id && this.hasSingleFilter()) {
      const item = this.get(id);
      return item ? [item] : [];
    }

    return handleCommunicationError(() => this.takeUnsafe(schema));
  }

  transform({ filters, search, order, limit }: DataScopeParams): DataScope {
    return new ExternalDataScope(this._dataClass, this._attributeName, {
      filters: combineFilters(
        this._params.filters,
        this.normalizeFilters(filters)
      ),
      search: combineSearches(this._params.search, search),
      order: order || this._params.order,
      limit: limit ?? this._params.limit,
    });
  }

  objSearch(): undefined {
    return;
  }

  count(): number | null {
    const { filters, search } = this._params;
    const dataClassName = this.dataClassName();
    const schema = getDataClassSchema(dataClassName);
    if (!schema) return null;

    return handleCommunicationError(() =>
      countExternalData(dataClassName, filters, search, schema)
    );
  }

  limit(): number | undefined {
    return this._params.limit;
  }

  /** @internal */
  toPojo(): PresentDataScopePojo {
    return {
      _class: this.dataClassName(),
      _attribute: this._attributeName,
      ...this._params,
    };
  }

  private takeUnsafe(schema: DataClassSchema) {
    return extractFromIterator(
      this.getIterator(schema),
      this._params.limit ?? DEFAULT_LIMIT
    );
  }

  private getIterator(schema: DataClassSchema) {
    return transformContinueIterable(
      getExternalDataQuery(this.toPojo(), schema),
      (iterator) =>
        iterator.map((dataId) =>
          ExternalDataItem.buildWithLoadedSchema(
            this._dataClass,
            dataId,
            schema
          )
        )
    ).iterator();
  }

  private assertNoIdFilter() {
    const { filters } = this._params;

    if (filters && Object.keys(filters).includes('_id')) {
      throw new ArgumentError(
        `Cannot create a ${this.dataClassName()} from a scope that includes "_id" in its filters`
      );
    }
  }

  private itemIdFromFilters() {
    return itemIdFromFilters(this._params.filters);
  }

  private hasSingleFilter() {
    const { filters, search } = this._params;
    return filters && Object.keys(filters).length === 1 && !search;
  }
}

/** @beta */
export class ExternalDataItem extends DataItem {
  /** Returns an item if its schema is loaded. Returns null otherwise. */
  /** Triggers schema loading, thus requires a loading context. */
  static build(dataClass: DataClass, dataId: string): ExternalDataItem | null {
    const schema = getDataClassSchema(dataClass.name());
    return schema ? new ExternalDataItem(dataClass, dataId) : null;
  }

  /** Returns an item for an already loaded schema */
  static buildWithLoadedSchema(
    dataClass: DataClass,
    dataId: string,
    schema: DataClassSchema
  ): ExternalDataItem {
    if (!schema) throw new InternalError();
    return new ExternalDataItem(dataClass, dataId);
  }

  /** Only for DataClass#getUnchecked */
  static buildUnchecked(
    dataClass: DataClass,
    dataId: string
  ): ExternalDataItem {
    return new ExternalDataItem(dataClass, dataId);
  }

  private constructor(
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

  dataClassName(): string {
    return this._dataClass.name();
  }

  obj(): undefined {
    return;
  }

  get(attributeName: string): unknown {
    const externalData = this.getExternalData();
    if (!externalData) return null;

    const dataClassName = this.dataClassName();
    const schema = getDataClassSchema(dataClassName);

    return schema
      ? deserializeDataAttribute({
          dataClassName,
          attributeName,
          value: externalData[attributeName],
          schema,
        })
      : null;
  }

  async update(attributes: DataItemAttributes): Promise<void> {
    assertValidDataItemAttributes(attributes);

    const externalData = await load(() => this.getExternalData());
    if (!externalData) {
      throw new ArgumentError(`Missing data with ID ${this._dataId}`);
    }

    const dataClassName = this.dataClassName();
    const schema = await loadSchemaOrThrow(dataClassName);

    const serializedAttributes = serializeAttributes(
      dataClassName,
      attributes,
      schema
    );

    const updateCallback = this.getConnection().update;
    const response = await updateCallback(this._dataId, serializedAttributes);

    setExternalData(dataClassName, this._dataId, {
      ...externalData,
      ...serializedAttributes,
      ...(response || {}),
    });

    this.notifyWrite();
  }

  async delete(): Promise<void> {
    const deleteCallback = this.getConnection().delete;
    await deleteCallback(this._dataId);

    setExternalData(this.dataClassName(), this._dataId, null);

    this.notifyWrite();
  }

  /** @internal */
  getExternalData(): ExternalData | null | undefined {
    return getExternalData(this.dataClassName(), this._dataId);
  }

  private getConnection() {
    return getConnection(this.dataClassName());
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

function serializeAttributes(
  dataClassName: string,
  attributes: DataItemAttributes,
  schema: DataClassSchema
) {
  return mapValues(attributes, (value, attributeName) =>
    serializeDataAttribute({ dataClassName, attributeName, value, schema })
  );
}

function isCommunicationError(
  error: unknown
): error is ClientError | DataConnectionError {
  return error instanceof ClientError || error instanceof DataConnectionError;
}

function handleCommunicationError<T>(request: () => T) {
  try {
    return request();
  } catch (error) {
    if (isCommunicationError(error)) throw new DataScopeError(error.message);
    throw error;
  }
}

async function loadSchemaOrThrow(dataClassName: string) {
  const schema = await load(() => getDataClassSchema(dataClassName));

  // A schema must be stored first
  if (!schema) throw new InternalError();

  return schema;
}
