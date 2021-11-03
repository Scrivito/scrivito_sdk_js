import * as React from 'react';

import { isComparisonActive } from 'scrivito_sdk/app_support/editing_context';
import { getComparisonRange } from 'scrivito_sdk/app_support/get_comparison_range';
import { ArgumentError, throwNextTick } from 'scrivito_sdk/common';
import { importFrom } from 'scrivito_sdk/import_from';
import { AttributeValue } from 'scrivito_sdk/react/components/content_tag/attribute_value';
import { WidgetProps } from 'scrivito_sdk/react/components/content_tag/widget_content';
import { connect } from 'scrivito_sdk/react/connect';
import { Obj, Schema, Widget } from 'scrivito_sdk/realm';

export interface ContentTagProps {
  tag?: string;
  content: Obj | Widget | null;
  attribute: string;
  widgetProps?: WidgetProps;

  [key: string]: unknown;
}

/** @public */
export const ContentTag: React.ComponentType<ContentTagProps> = connect(render);
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
    field = field.inObjSpace(to) || field.inObjSpace(from);
    if (!field) return null;
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
