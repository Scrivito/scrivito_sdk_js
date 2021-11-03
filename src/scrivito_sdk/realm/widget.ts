import { ArgumentError, InternalError } from 'scrivito_sdk/common';
import { AttributeType, BasicWidget } from 'scrivito_sdk/models';
import { assertValidAttributeName } from 'scrivito_sdk/realm/assert_valid_attribute_name';

import { AttrDict } from 'scrivito_sdk/realm/attribute_types';
import { initialAttributesFor } from 'scrivito_sdk/realm/initial_attributes_for';
import { Obj } from 'scrivito_sdk/realm/obj';
import { objClassNameFor } from 'scrivito_sdk/realm/registry';
import { Schema } from 'scrivito_sdk/realm/schema';
import {
  AttributeValue,
  unwrapAppAttributes,
  wrapInAppClass,
} from 'scrivito_sdk/realm/wrap_in_app_class';
import { readAppAttribute, updateAppAttributes } from './app_model_accessor';

export interface WidgetClass {
  /** @internal */
  readonly _scrivitoPrivateSchema?: Schema;

  new (attributes?: AttrDict): Widget;
}

/** @public */
export class Widget {
  /** @internal */
  readonly _scrivitoPrivateContent: BasicWidget;

  /** @internal */
  static readonly _scrivitoPrivateSchema?: Schema;

  constructor(attributes: AttrDict = {}) {
    const appClassName = objClassNameFor(this.constructor as WidgetClass);

    if (!appClassName) {
      throw new ArgumentError(
        'Use a specific class (like TextWidget or ImageWidget) to create a Widget.'
      );
    }

    assertValidAttributes(attributes);

    const schema = Schema.forInstance(this);
    // schema should exist, if objClassNameFor can find something
    if (!schema) throw new InternalError();

    const basicAttributes = unwrapAppAttributes(
      { ...attributes, _objClass: appClassName },
      schema,
      appClassName
    );

    const basicWidget = BasicWidget.createWithUnknownValues(basicAttributes);

    basicWidget.onDidPersist((copiedWidget) => {
      const appWidget = wrapInAppClass(copiedWidget);
      const initialAttributes = initialAttributesFor(
        basicAttributes,
        schema,
        appClassName
      );

      updateAppAttributes(appWidget, initialAttributes);
    });

    this._scrivitoPrivateContent = basicWidget;
  }

  id(): string {
    return this._scrivitoPrivateContent.id();
  }

  objClass(): string {
    return this._scrivitoPrivateContent.objClass();
  }

  get<T extends AttributeType>(attributeName: string): AttributeValue<T> {
    assertValidAttributeName(attributeName);

    return readAppAttribute(this, attributeName)!;
  }

  update(attributes: Partial<AttrDict>): void {
    updateAppAttributes(this, attributes);
  }

  obj(): Obj {
    const basicObj = this._scrivitoPrivateContent.obj();

    return wrapInAppClass(basicObj);
  }

  copy(): Widget {
    const basicWidget = this._scrivitoPrivateContent.copy();

    return wrapInAppClass(basicWidget);
  }

  destroy(): void {
    this._scrivitoPrivateContent.remove();
  }

  container(): Obj | Widget {
    const container = this._scrivitoPrivateContent.container();

    return wrapInAppClass(container);
  }
}

function assertValidAttributes(attributes: { [name: string]: unknown }) {
  if (attributes.constructor !== Object) {
    throw new ArgumentError(
      'The provided attributes are invalid. They have ' +
        'to be an Object with valid Scrivito attribute values.'
    );
  }

  if (attributes._objClass) {
    throw new ArgumentError(
      'Invalid attribute "_objClass". ' +
        `"new ${attributes._objClass}" will automatically set the CMS object class correctly.`
    );
  }
}
