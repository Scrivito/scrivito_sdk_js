import { ExistentObjJson } from 'scrivito_sdk/client';
import { camelCase } from 'scrivito_sdk/common';
import {
  BasicObj,
  BasicObjAttributes,
  SerializedObjAttributes,
} from 'scrivito_sdk/models/basic_obj';
import {
  BasicWidget,
  SerializedWidgetAttributes,
} from 'scrivito_sdk/models/basic_widget';

import { Binary } from 'scrivito_sdk/models/binary';
import { ObjScope } from 'scrivito_sdk/models/obj_scope';

export function createObjIn(
  scope: ObjScope,
  attributes: BasicObjAttributes
): BasicObj {
  const { _id: objId, _objClass: objClass, ...otherAttributes } = attributes;

  const maybeObjClass = denormalizeSystemAttributeValue(objClass);
  const maybeObjId = denormalizeSystemAttributeValue(objId);

  return createObj(
    scope,
    maybeObjId || BasicObj.generateId(),
    { _obj_class: maybeObjClass },
    otherAttributes
  );
}

export function createObjFromFileIn(
  scope: ObjScope,
  file: File,
  attributes: BasicObjAttributes
): Promise<BasicObj> {
  const maybeId = denormalizeSystemAttributeValue(attributes._id);
  const objId = maybeId || BasicObj.generateId();

  return Binary.upload(file)
    .intoId(objId)
    .then((binary) => {
      const basicObj = createObjIn(scope, {
        ...attributes,
        _id: [objId],
        blob: [binary, ['binary']],
      });
      return basicObj.finishSaving().then(() => basicObj);
    });
}

export function createObjWithSerializedAttributesIn(
  scope: ObjScope,
  serializedAttributes: SerializedObjAttributes
): BasicObj {
  const [objJson, basicAttributes] = extractWidgetlistValues(
    serializedAttributes
  );

  return createObj(scope, objJson._id, objJson, basicAttributes);
}

function createObj(
  scope: ObjScope,
  id: string,
  objJson: Partial<ExistentObjJson>,
  basicAttributes: BasicObjAttributes
) {
  const obj = scope.create(id, objJson);
  obj.update(basicAttributes);

  return obj;
}

function denormalizeSystemAttributeValue(value: unknown): string | undefined {
  const maybeStringValue = Array.isArray(value) ? value[0] : value;
  return typeof maybeStringValue === 'string' ? maybeStringValue : undefined;
}

interface WidgetlistAttributes {
  [key: string]: [BasicWidget[], ['widgetlist']];
}

type SerializedWidgetlistValue = ['widgetlist', SerializedWidgetAttributes[]];

function extractWidgetlistValues(
  attributes: SerializedObjAttributes
): [ExistentObjJson, WidgetlistAttributes] {
  const serializedAttributes = { ...attributes };
  const widgetlistAttributes: WidgetlistAttributes = {};

  Object.keys(attributes).forEach((name) => {
    const serializedValue = attributes[name];

    if (isSerializedWidgetlistValue(serializedValue)) {
      const widgets = serializedValue[1].map((serializedWidgetAttributes) =>
        BasicWidget.newWithSerializedAttributes(serializedWidgetAttributes)
      );

      const attrName = camelCase(name);
      widgetlistAttributes[attrName] = [widgets, ['widgetlist']];
      delete serializedAttributes[name];
    }
  });

  // serializeAttributes returns ObjJson with widgetlists "inlined"
  // therefore if widgetlists are removed, what's left is pure ObjJson
  return [serializedAttributes as ExistentObjJson, widgetlistAttributes];
}

function isSerializedWidgetlistValue(
  value: unknown
): value is SerializedWidgetlistValue {
  return Array.isArray(value) && value[0] === 'widgetlist';
}
