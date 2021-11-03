import { find } from 'underscore';

import {
  AttributeJson,
  ExistentObjJson,
  WidgetJson,
  isWidgetlistAttributeJson,
} from 'scrivito_sdk/client';
import { isSystemAttribute } from 'scrivito_sdk/common';

export interface WidgetPlacement {
  attributeName: string;
  index: number;
  parentWidgetId?: string;
}

export function findWidgetPlacement(
  objData: ExistentObjJson,
  widgetId: string
): WidgetPlacement | undefined {
  let placement = findWidgetPlacementIn(objData, widgetId);

  if (placement) return placement;

  find(objData._widget_pool!, (parentWidgetData, parentWidgetId) => {
    if (parentWidgetData) {
      placement = findWidgetPlacementIn(parentWidgetData, widgetId);

      if (placement) {
        placement.parentWidgetId = parentWidgetId;

        return true;
      }
    }
  });

  return placement;
}

function findWidgetPlacementIn(
  objOrWidgetData: ExistentObjJson | WidgetJson,
  widgetId: string
): WidgetPlacement | undefined {
  let placement;

  find(objOrWidgetData, (jsonValue, attributeName) => {
    if (!jsonValue) return;

    if (isSystemAttribute(attributeName)) return;

    // Typescript cannot know that once blank and system attribute entries
    // are excluded, what's left must be a custom attribute entry, and the
    // cast is therefore safe.
    const attributeJson = jsonValue as AttributeJson;

    if (!isWidgetlistAttributeJson(attributeJson)) return;

    const widgetIds = attributeJson[1];

    if (!widgetIds) return;

    const index = widgetIds.indexOf(widgetId);

    if (index !== -1) {
      placement = { attributeName, index };
      return true;
    }
  });

  return placement;
}
