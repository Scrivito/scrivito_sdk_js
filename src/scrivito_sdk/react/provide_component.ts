import * as React from 'react';

import { ArgumentError, prettyPrint } from 'scrivito_sdk/common';
import { registerComponentForAppClass } from 'scrivito_sdk/react/component_registry';
import { WidgetComponentProps } from 'scrivito_sdk/react/components/content_tag/widget_content';
import { WidgetTag } from 'scrivito_sdk/react/components/widget_tag';
import { connect, isClassComponent } from 'scrivito_sdk/react/connect';
import { displayNameFromComponent } from 'scrivito_sdk/react/display_name_from_component';
import { PageComponentProps } from 'scrivito_sdk/react/get_component_for_page_class';
import { getElementType } from 'scrivito_sdk/react/get_element_type';
import { memo } from 'scrivito_sdk/react/memo';

/** @public */
export function provideComponent<
  P extends Partial<PageComponentProps> | Partial<WidgetComponentProps>
>(className: string, component: React.ComponentType<P>): void {
  assertValidComponent(component);

  if (isComponentMissingName(component)) {
    component.displayName = className;
  }

  const connectedComponent = connect(component);
  const wrappedComponent = wrapComponent(connectedComponent);

  registerComponentForAppClass(className, wrappedComponent);
}

function assertValidComponent(component: unknown) {
  if (typeof component !== 'function') {
    throw new ArgumentError(
      'Scrivito.provideComponent expected a valid React component' +
        `, but received ${prettyPrint(component)}`
    );
  }
}

function wrapComponent(component: React.ComponentType) {
  const wrappedComponent = isClassComponent(component)
    ? wrapClassComponent(component)
    : wrapFunctionComponent(component);

  wrappedComponent.displayName = displayNameFromComponent(component);

  return wrappedComponent;
}

function wrapFunctionComponent<Props>(
  functionComponent: React.FunctionComponent<Props>
): React.FunctionComponent<Props> {
  return memo((props: Props) =>
    hasWidgetProp(props)
      ? wrapInWidgetTag(functionComponent(props))
      : functionComponent(props)
  );
}

function wrapClassComponent(component: React.ComponentClass) {
  return class extends component {
    render() {
      return hasWidgetProp(this.props)
        ? wrapInWidgetTag(super.render())
        : super.render();
    }
  };
}

function hasWidgetProp(props: {}) {
  return !!(props as { widget?: unknown }).widget;
}

function wrapInWidgetTag<Rendered extends React.ReactNode>(
  rendered: Rendered
): React.ReactElement | Rendered {
  return getElementType(rendered) === WidgetTag
    ? rendered
    : React.createElement(WidgetTag, { children: rendered });
}

function isComponentMissingName(component: React.ComponentType) {
  // In some browsers functional components are missing the `name` property.
  // In some other browsers they have that property, but the value is meaningless: `_class`.
  return (
    !component.displayName &&
    (!component.name ||
      component.name === '_class' ||
      component.name.substring(0, 6) === 'class_')
  );
}
