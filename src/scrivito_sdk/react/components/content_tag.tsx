import * as React from 'react';

import { shouldContentTagsForEmptyAttributesBeSkipped } from 'scrivito_sdk/app_support/content_tags_for_empty_attributes';
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
import { AttributeDefinitions, Obj, Schema, Widget } from 'scrivito_sdk/realm';

export interface ContentTagProps<
  AttrDefs extends AttributeDefinitions = AttributeDefinitions
> {
  tag?: string;
  content: Obj<AttrDefs> | Widget<AttrDefs> | null;
  attribute: keyof AttrDefs & string;
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

/** @public */
export const ContentTag = connect(render) as ContentTagType;
ContentTag.displayName = 'Scrivito.ContentTag';

export const ContentTagWithCallback: React.ComponentType<
  ContentTagProps & {
    elementCallback?: (element?: HTMLElement) => void;
  }
> = connect(({ elementCallback, ...props }) => render(props, elementCallback));

function render(
  { content, attribute, tag, widgetProps, ...customProps }: ContentTagProps,
  elementCallback?: (element?: HTMLElement) => void
) {
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

  if (widgetProps && field.type() !== 'widgetlist') {
    throwNextTick(
      new ArgumentError(
        'The prop "widgetProps" is only allowed for widgetlist attributes'
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

  if (AttributeValueWithEditing) {
    return <AttributeValueWithEditing {...contentTagProps} />;
  }

  return <AttributeValue {...contentTagProps} />;
}
