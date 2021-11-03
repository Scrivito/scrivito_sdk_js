import * as React from 'react';

import { isInPlaceEditingActive } from 'scrivito_sdk/app_support/editing_context';
import { ArgumentError, throwNextTick } from 'scrivito_sdk/common';
import { BasicWidget, PlacementModification } from 'scrivito_sdk/models';
import { getComponentForAppClass } from 'scrivito_sdk/react/component_registry';
import { WidgetTag } from 'scrivito_sdk/react/components/widget_tag';
import { connect } from 'scrivito_sdk/react/connect';
import { Widget, wrapInAppClass } from 'scrivito_sdk/realm';

export interface WidgetProps {
  [key: string]: unknown;
}

interface WidgetContentProps {
  widget: BasicWidget;
  widgetProps?: WidgetProps;
  placementModification?: PlacementModification;
}

interface WidgetContentState {
  hasError: boolean;
}

export const WidgetContent: React.ComponentType<WidgetContentProps> = connect(
  class WidgetContent extends React.Component<
    WidgetContentProps,
    WidgetContentState
  > {
    static displayName = 'Scrivito.ContentTag.WidgetContent';

    constructor(props: WidgetContentProps) {
      super(props);

      this.state = {
        hasError: false,
      };
    }

    componentDidCatch(e: Error) {
      throwNextTick(e);
      this.setState({ hasError: true });
    }

    shouldComponentUpdate(nextProps: WidgetContentProps): boolean {
      return this.props.widget.equals(nextProps.widget);
    }

    render() {
      if (this.state.hasError) {
        let children;
        if (isInPlaceEditingActive()) {
          children = (
            <div className="content_error">
              Widget could not be rendered due to application error.
            </div>
          );
        }
        return withWidgetContext(
          this.props.widget,
          <WidgetTag children={children} />,
          this.props.placementModification
        );
      }

      return (
        <AppWidgetWrapper
          widget={this.props.widget}
          widgetProps={this.props.widgetProps}
          placementModification={this.props.placementModification}
        />
      );
    }
  }
);

interface AppWidgetWrapperProps {
  widget: BasicWidget;
  widgetProps?: WidgetProps;
  placementModification?: PlacementModification;
}

/** @public */
export interface WidgetComponentProps {
  widget: Widget;
}

class AppWidgetWrapper extends React.Component<AppWidgetWrapperProps> {
  constructor(props: AppWidgetWrapperProps) {
    super(props);
  }

  render() {
    return withWidgetContext(
      this.props.widget,
      React.createElement<WidgetComponentProps>(
        this.getAppWidgetComponent(),
        this.getWidgetComponentProps()
      ),
      this.props.placementModification
    );
  }

  private getAppWidgetComponent(): React.ComponentType<WidgetComponentProps> {
    const widgetClass = this.props.widget.objClass();
    const widgetComponent = getComponentForAppClass(widgetClass);

    if (!widgetComponent) {
      throw new ArgumentError(
        `No component registered for widget class "${widgetClass}"`
      );
    }

    return widgetComponent as React.ComponentType<WidgetComponentProps>;
  }

  private getWidgetComponentProps(): WidgetComponentProps {
    const appWidget = wrapInAppClass(this.props.widget);
    const widgetComponentProps: WidgetComponentProps = { widget: appWidget };

    if (
      this.props.widgetProps &&
      this.props.widgetProps.hasOwnProperty('widget')
    ) {
      throwNextTick(
        new ArgumentError(
          'The prop "widget" is not allowed inside "widgetProps"'
        )
      );
      const { widget, ...widgetPropsWithoutWidget } = this.props.widgetProps;

      return {
        ...widgetComponentProps,
        ...widgetPropsWithoutWidget,
      };
    }

    return {
      ...widgetComponentProps,
      ...this.props.widgetProps,
    };
  }
}

interface WidgetTagContextValue {
  widget?: BasicWidget;
  placementModification?: PlacementModification;
}

export const WidgetTagContext = React.createContext<WidgetTagContextValue>({});

function withWidgetContext(
  widget: BasicWidget,
  reactElement: React.ReactElement<{}>,
  placementModification?: PlacementModification
): React.ReactElement<{}> {
  return (
    <WidgetTagContext.Provider
      value={{ widget, placementModification }}
      children={reactElement}
    />
  );
}
