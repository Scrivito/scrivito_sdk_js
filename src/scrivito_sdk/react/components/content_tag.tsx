// @rewire
import * as React from 'react';

import { basicObjToDataContext } from 'scrivito_sdk/app_support/basic_obj_to_data_context';
import { shouldContentTagsForEmptyAttributesBeSkipped } from 'scrivito_sdk/app_support/content_tags_for_empty_attributes';
import {
  DataItem,
  DataScope,
  isDataItem,
  isDataScope,
} from 'scrivito_sdk/app_support/data_class';
import type {
  DataContext,
  DataContextCallback,
} from 'scrivito_sdk/app_support/data_context';
import {
  isComparisonActive,
  isInPlaceEditingActive,
} from 'scrivito_sdk/app_support/editing_context';
import { ExternalDataItem } from 'scrivito_sdk/app_support/external_data_class';
import { getExternalDataFrom } from 'scrivito_sdk/app_support/external_data_store';
import { externalDataToDataContext } from 'scrivito_sdk/app_support/external_data_to_data_context';
import { getComparisonRange } from 'scrivito_sdk/app_support/get_comparison_range';
import { ObjDataItem } from 'scrivito_sdk/app_support/obj_data_class';
import {
  ArgumentError,
  isEmptyValue,
  throwNextTick,
} from 'scrivito_sdk/common';
import { importFrom } from 'scrivito_sdk/import_from';
import { AttributeType, BasicField } from 'scrivito_sdk/models';
import { AttributeValue } from 'scrivito_sdk/react/components/content_tag/attribute_value';
import { WidgetProps } from 'scrivito_sdk/react/components/content_tag/widget_content';
import { connect } from 'scrivito_sdk/react/connect';
import { DataContextProvider } from 'scrivito_sdk/react/data_context_container';
import {
  AttributeDefinitions,
  Obj,
  Schema,
  Widget,
  unwrapAppClass,
} from 'scrivito_sdk/realm';

type DataContextProp =
  | DataContext
  | DataContextCallback
  | Obj
  | DataItem
  | DataScope
  | null;

export interface ContentTagProps<
  AttrDefs extends AttributeDefinitions = AttributeDefinitions
> {
  tag?: string;
  content: Obj<AttrDefs> | Widget<AttrDefs> | null;
  attribute: keyof AttrDefs & string;
  dataContext?: DataContextProp;
  widgetProps?: WidgetProps;

  [key: string]: unknown;
}

type ContentTagType = {
  <AttrDefs extends AttributeDefinitions = AttributeDefinitions>(
    props: ContentTagProps<AttrDefs>
  ): React.ReactElement | null;

  /** @internal */
  displayName?: string;
};

type ContentTagWithElementCallbackProps = ContentTagProps & {
  elementCallback?: (element?: HTMLElement) => void;
};

export const ContentTagWithElementCallback: React.ComponentType<ContentTagWithElementCallbackProps> =
  connect(function ContentTagWithElementCallback({
    content,
    attribute,
    tag,
    dataContext: dataContextProp,
    widgetProps,
    elementCallback,
    ...customProps
  }: ContentTagWithElementCallbackProps) {
    if (!content) return null;

    let field = getField(content, attribute);
    if (!field) return null;

    if (isComparisonActive()) {
      const [fromField, toField] = getFieldsForComparison(field);
      if (shouldComparisonBeSkipped(fromField, toField)) return null;

      field = toField || fromField;
      if (!field) return null;
    }

    if (
      !isInPlaceEditingActive() &&
      !isComparisonActive() &&
      isEmptyValue(field.get()) &&
      shouldContentTagsForEmptyAttributesBeSkipped()
    ) {
      return null;
    }

    assertWidgetPropsAreAllowed(widgetProps, field);

    const contentTagProps = {
      elementCallback,
      field,
      tag: tag || 'div',
      customProps,
      widgetProps,
    };

    const AttributeValueWithEditing = importFrom(
      'reactEditing',
      'AttributeValueWithEditing'
    );

    const AttributeValueComponent = AttributeValueWithEditing || AttributeValue;
    const attributeValue = <AttributeValueComponent {...contentTagProps} />;
    const dataContext = dataContextPropToDataContext(dataContextProp);

    if (dataContext) {
      return (
        <DataContextProvider dataContext={dataContext}>
          {attributeValue}
        </DataContextProvider>
      );
    }

    return attributeValue;
  });

function getField<AttrDefs extends AttributeDefinitions = AttributeDefinitions>(
  content: Obj<AttrDefs> | Widget<AttrDefs>,
  attribute: keyof AttrDefs & string
) {
  const field = Schema.basicFieldFor(content, attribute);
  if (field) return field;

  throwNextTick(
    new ArgumentError(
      'Component "Scrivito.ContentTag" received prop "attribute" with invalid value: ' +
        `Attribute "${attribute}" is not defined for content specified in prop "content".`
    )
  );

  return null;
}

function getFieldsForComparison<T extends AttributeType>(field: BasicField<T>) {
  return getComparisonRange().map((objSpace) => field.inObjSpace(objSpace));
}

function assertWidgetPropsAreAllowed<T extends AttributeType>(
  widgetProps: WidgetProps | undefined,
  field: BasicField<T>
) {
  if (!widgetProps) return;

  const fieldType = field.type();

  if (!(fieldType === 'widget' || fieldType === 'widgetlist')) {
    throwNextTick(
      new ArgumentError(
        'The prop "widgetProps" is only allowed for widget and widgetlist attributes'
      )
    );
  }
}

function shouldComparisonBeSkipped<T extends AttributeType>(
  fromField: BasicField<T> | null,
  toField?: BasicField<T> | null
) {
  return (
    isEmptyValue(fromField?.get()) &&
    isEmptyValue(toField?.get()) &&
    shouldContentTagsForEmptyAttributesBeSkipped()
  );
}

function dataContextPropToDataContext(
  dataContextProp: DataContextProp | undefined
) {
  if (isDataItem(dataContextProp)) {
    return dataContextFromDataItem(dataContextProp);
  }

  if (isDataScope(dataContextProp)) {
    return dataContextFromDataScope(dataContextProp);
  }

  if (dataContextProp instanceof Obj) {
    return basicObjToDataContext(unwrapAppClass(dataContextProp));
  }

  if (
    isDataContextObject(dataContextProp) &&
    (dataContextProp._class || dataContextProp._id)
  ) {
    throwNextTick(
      new ArgumentError(
        'The object provided via "dataContext" prop must not contain keys "_class" and "_id"'
      )
    );

    return undefined;
  }

  return dataContextProp;
}

function dataContextFromDataItem(dataItem: DataItem) {
  if (dataItem instanceof ExternalDataItem) {
    return externalDataItemToDataContext(dataItem);
  }

  if (dataItem instanceof ObjDataItem) {
    return objDataItemToDataContext(dataItem);
  }
}

function dataContextFromDataScope(dataScope: DataScope) {
  return { _class: dataScope.dataClass().name() };
}

function isDataContextObject(
  dataContext: DataContext | DataContextCallback | null | undefined
): dataContext is DataContext {
  return !!dataContext && typeof dataContext !== 'function';
}

function objDataItemToDataContext(dataItem: ObjDataItem) {
  const obj = dataItem.obj();
  return obj ? basicObjToDataContext(unwrapAppClass(obj)) : undefined;
}

function externalDataItemToDataContext(dataItem: ExternalDataItem) {
  const dataClassName = dataItem.dataClass().name();
  const dataId = dataItem.id();
  const externalData = getExternalDataFrom(dataClassName, dataId);

  if (externalData) {
    return externalDataToDataContext(externalData, dataClassName, dataId);
  }
}

/** @public */
export const ContentTag = connect(
  ContentTagWithElementCallback
) as ContentTagType;
ContentTag.displayName = 'Scrivito.ContentTag';
