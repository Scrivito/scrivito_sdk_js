import * as React from 'react';

import { basicObjToDataContext } from 'scrivito_sdk/app_support/basic_obj_to_data_context';
import { shouldContentTagsForEmptyAttributesBeSkipped } from 'scrivito_sdk/app_support/content_tags_for_empty_attributes';
import { DataItem, isDataItem } from 'scrivito_sdk/app_support/data_class';
import type {
  DataContext,
  DataContextCallback,
} from 'scrivito_sdk/app_support/data_context';
import {
  isComparisonActive,
  isInPlaceEditingActive,
} from 'scrivito_sdk/app_support/editing_context';
import { getComparisonRange } from 'scrivito_sdk/app_support/get_comparison_range';
import {
  ArgumentError,
  isEmptyValue,
  throwNextTick,
} from 'scrivito_sdk/common';
import { importFrom } from 'scrivito_sdk/import_from';
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

export interface ContentTagProps<
  AttrDefs extends AttributeDefinitions = AttributeDefinitions
> {
  tag?: string;
  content: Obj<AttrDefs> | Widget<AttrDefs> | null;
  attribute: keyof AttrDefs & string;
  dataContext?: DataContext | DataContextCallback | Obj | DataItem | null;
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
    dataContext,
    widgetProps,
    elementCallback,
    ...customProps
  }: ContentTagWithElementCallbackProps) {
    if (!content) return null;

    let field = Schema.basicFieldFor(content, attribute);

    if (!field) {
      throwNextTick(
        new ArgumentError(
          'Component "Scrivito.ContentTag" received prop "attribute" with invalid value: ' +
            `Attribute "${attribute}" is not defined for content specified in prop "content".`
        )
      );

      return null;
    }

    if (isComparisonActive()) {
      const [from, to] = getComparisonRange();

      const toField = field.inObjSpace(to);
      const fromField = field.inObjSpace(from);

      field = toField || fromField;
      if (!field) return null;

      const toValue = toField?.get();
      const fromValue = fromField?.get();

      if (
        isEmptyValue(toValue) &&
        isEmptyValue(fromValue) &&
        shouldContentTagsForEmptyAttributesBeSkipped()
      ) {
        return null;
      }
    }

    if (
      !isInPlaceEditingActive() &&
      !isComparisonActive() &&
      isEmptyValue(field.get()) &&
      shouldContentTagsForEmptyAttributesBeSkipped()
    ) {
      return null;
    }

    const fieldType = field.type();

    if (
      widgetProps &&
      !(fieldType === 'widget' || fieldType === 'widgetlist')
    ) {
      throwNextTick(
        new ArgumentError(
          'The prop "widgetProps" is only allowed for widget and widgetlist attributes'
        )
      );
    }

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

    if (isDataItem(dataContext)) {
      const obj = dataContext.obj();

      if (obj) {
        return (
          <DataContextProvider
            dataContext={basicObjToDataContext(unwrapAppClass(obj))}
          >
            {attributeValue}
          </DataContextProvider>
        );
      }

      return attributeValue;
    }

    if (dataContext instanceof Obj) {
      return (
        <DataContextProvider
          dataContext={basicObjToDataContext(unwrapAppClass(dataContext))}
        >
          {attributeValue}
        </DataContextProvider>
      );
    }

    if (dataContext) {
      return (
        <DataContextProvider dataContext={dataContext}>
          {attributeValue}
        </DataContextProvider>
      );
    }

    return attributeValue;
  });

/** @public */
export const ContentTag = connect(
  ContentTagWithElementCallback
) as ContentTagType;
ContentTag.displayName = 'Scrivito.ContentTag';
