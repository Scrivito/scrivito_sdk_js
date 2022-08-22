import * as React from 'react';

import { canEditObjWithId } from 'scrivito_sdk/app_support/can_edit';
import {
  isComparisonActive,
  isInPlaceEditingActive,
} from 'scrivito_sdk/app_support/editing_context';
import { getComparisonRange } from 'scrivito_sdk/app_support/get_comparison_range';
import { importFrom } from 'scrivito_sdk/import_from';
import { BasicField, getPlacementModificationInfos } from 'scrivito_sdk/models';
import {
  WidgetContent,
  WidgetProps,
} from 'scrivito_sdk/react/components/content_tag/widget_content';
import { connect } from 'scrivito_sdk/react/connect';
import { InPlaceEditingEnabledContextConsumer } from 'scrivito_sdk/react/in_place_editing_enabled_context';

interface WidgetlistValueProps {
  field: BasicField<'widgetlist'>;
  widgetProps?: WidgetProps;
}

export const WidgetlistValue = connect(
  class WidgetlistValue extends React.Component<WidgetlistValueProps> {
    render() {
      if (isComparisonActive()) {
        return this.widgetlistChildrenForComparison();
      }

      const field = this.props.field;
      if (!isInPlaceEditingActive() || !canEditObjWithId(field.obj().id())) {
        return this.renderWidgets(field, false);
      }

      return (
        <InPlaceEditingEnabledContextConsumer>
          {(isInPlaceEditingEnabled) =>
            this.renderWidgets(field, isInPlaceEditingEnabled)
          }
        </InPlaceEditingEnabledContextConsumer>
      );
    }

    private renderWidgets(
      field: BasicField<'widgetlist'>,
      isInPlaceEditingEnabled: boolean
    ) {
      const widgets = this.props.field.get();
      if (widgets.length) {
        return (
          <>
            {widgets.map((widget) => (
              <WidgetContent
                key={widget.id()}
                widget={widget}
                widgetProps={this.props.widgetProps}
                fieldType="widgetlist"
              />
            ))}
          </>
        );
      }

      if (!isInPlaceEditingEnabled) return null;

      const WidgetlistPlaceholder = importFrom(
        'reactEditing',
        'WidgetlistPlaceholder'
      );

      return WidgetlistPlaceholder ? (
        <WidgetlistPlaceholder field={field} />
      ) : null;
    }

    private widgetlistChildrenForComparison() {
      return getPlacementModificationInfos(
        this.props.field,
        getComparisonRange()
      ).map((info) => (
        <WidgetContent
          key={`${info.widget.id()}-${info.modification}`}
          widget={info.widget}
          widgetProps={this.props.widgetProps}
          placementModification={info.modification}
          fieldType="widgetlist"
        />
      ));
    }
  }
);
