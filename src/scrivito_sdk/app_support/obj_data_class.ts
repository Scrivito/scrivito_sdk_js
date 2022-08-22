import {
  DataClass,
  DataItem,
  DataItemAttributes,
} from 'scrivito_sdk/app_support/data_class';
import {
  currentObjSpaceId,
  getObjFrom,
  objSpaceScope,
  restrictToObjClass,
} from 'scrivito_sdk/models';
import { BasicObj, BasicObjAttributes } from 'scrivito_sdk/models';
import { Obj, wrapInAppClass } from 'scrivito_sdk/realm';

export class ObjDataClass implements DataClass {
  constructor(private readonly _name: string) {}

  name(): string {
    return this._name;
  }

  get(id: string): DataItem | null {
    const obj = getObjFrom(
      objSpaceScope(currentObjSpaceId()).and(restrictToObjClass(this._name)),
      id
    );

    return obj ? new ObjDataItem(obj, this) : null;
  }
}

class ObjDataItem implements DataItem {
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
    const basicObjAttributes: BasicObjAttributes = {};

    Object.keys(attributes).forEach((attributeName) => {
      basicObjAttributes[attributeName] = [attributes[attributeName], 'string'];
    });

    this._obj.update(basicObjAttributes);

    return this._obj.finishSaving();
  }

  destroy(): Promise<void> {
    this._obj.destroy();
    return this._obj.finishSaving();
  }
}
