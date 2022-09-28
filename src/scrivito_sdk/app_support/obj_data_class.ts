import {
  DataClass,
  DataItem,
  DataItemAttributes,
  DataScope,
} from 'scrivito_sdk/app_support/data_class';
import { ArgumentError } from 'scrivito_sdk/common';
import {
  createObjIn,
  currentObjSpaceId,
  getObjFrom,
  objSpaceScope,
  restrictToObjClass,
} from 'scrivito_sdk/models';
import { BasicObj, BasicObjAttributes } from 'scrivito_sdk/models';
import { Obj, Schema, getClass, wrapInAppClass } from 'scrivito_sdk/realm';

export class ObjDataClass implements DataClass {
  constructor(private readonly _name: string) {}

  name(): string {
    return this._name;
  }

  async create(attributes: DataItemAttributes): Promise<DataItem> {
    return this.all().create(attributes);
  }

  all(): DataScope {
    return new ObjDataScope(this);
  }

  get(id: string): DataItem | null {
    const obj = getObjFrom(objClassScope(this), id);
    return obj ? new ObjDataItem(obj, this) : null;
  }
}

export class ObjDataScope implements DataScope {
  constructor(
    private readonly _dataClass: DataClass,
    private readonly _filters: DataItemAttributes = {}
  ) {}

  dataClass(): DataClass {
    return this._dataClass;
  }

  async create(attributes: DataItemAttributes): Promise<DataItem> {
    this.assertValidAttributes(attributes);
    this.assertNoConflictsWithFilters(attributes);

    const obj = createObjIn(
      this.objClassScope(),
      toBasicObjAttributes({ ...attributes, ...this._filters })
    );

    // Important: Wait for saving to finish
    await obj.finishSaving();

    return this.wrapInDataItem(obj);
  }

  take(count: number): DataItem[] {
    let search = this.objClassScope().search();

    Object.keys(this._filters).forEach((attributeName) => {
      search = search.and(
        attributeName,
        'equals',
        this._filters[attributeName]
      );
    });

    return search.take(count).map((obj) => this.wrapInDataItem(obj));
  }

  filter(attributeName: string, value: string): DataScope {
    this.assertNoConflictsWithFilters({ [attributeName]: value });

    return new ObjDataScope(this._dataClass, {
      ...this._filters,
      [attributeName]: value,
    });
  }

  private objClassScope() {
    return objClassScope(this._dataClass);
  }

  private wrapInDataItem(obj: BasicObj) {
    return new ObjDataItem(obj, this._dataClass);
  }

  private assertValidAttributes(attributes: DataItemAttributes) {
    const schema = this.schema();
    const attributeDefinitions = schema.normalizedAttributes();

    Object.keys(attributes).forEach((attributeName) => {
      const attributeDefinition = attributeDefinitions[attributeName];

      if (!attributeDefinition) {
        throw new ArgumentError(
          `No such attribute "${attributeName}" for obj class "${this.dataClassName()}"`
        );
      }

      const attributeType = attributeDefinition[0];

      if (attributeType !== 'string') {
        throw new ArgumentError(
          `Attribute "${attributeName}" of obj class "${this.dataClassName()} must be a string`
        );
      }
    });
  }

  private assertNoConflictsWithFilters(attributes: DataItemAttributes) {
    Object.keys(attributes).forEach((attributeName) => {
      if (this._filters.hasOwnProperty(attributeName)) {
        const attributeValue = attributes[attributeName];
        const filterValue = this._filters[attributeName];

        if (attributeValue !== filterValue) {
          throw new ArgumentError(
            `Tried to create ${attributeName}: ${attributeValue} in a context of ${attributeName}: ${filterValue}`
          );
        }
      }
    });
  }

  private schema() {
    const dataClassName = this.dataClassName();
    const objClass = getClass(dataClassName);

    if (!objClass) {
      throw new ArgumentError(`No such obj class "${dataClassName}"`);
    }

    const schema = Schema.forClass(objClass);

    if (!schema) {
      throw new ArgumentError(
        `There is no schema for obj class "${dataClassName}"`
      );
    }

    return schema;
  }

  private dataClassName() {
    return this._dataClass.name();
  }
}

export class ObjDataItem implements DataItem {
  constructor(
    private readonly _obj: BasicObj,
    private readonly _dataClass: DataClass
  ) {}

  id(): string {
    return this._obj.id();
  }

  dataClass(): DataClass {
    return this._dataClass;
  }

  obj(): Obj {
    return wrapInAppClass(this._obj);
  }

  get(attributeName: string): string {
    return this._obj.get(attributeName, 'string');
  }

  update(attributes: DataItemAttributes): Promise<void> {
    this._obj.update(toBasicObjAttributes(attributes));
    return this._obj.finishSaving();
  }

  destroy(): Promise<void> {
    this._obj.destroy();
    return this._obj.finishSaving();
  }
}

export function isObjDataClassProvided(dataClassName: string): boolean {
  return !!getClass(dataClassName);
}

function objClassScope(dataClass: DataClass) {
  return objSpaceScope(currentObjSpaceId()).and(
    restrictToObjClass(dataClass.name())
  );
}

function toBasicObjAttributes(attributes: DataItemAttributes) {
  const basicObjAttributes: BasicObjAttributes = {};

  Object.keys(attributes).forEach((attributeName) => {
    basicObjAttributes[attributeName] = [attributes[attributeName], 'string'];
  });

  return basicObjAttributes;
}
