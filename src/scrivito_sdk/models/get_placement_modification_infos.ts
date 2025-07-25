import { ComparisonRange, WidgetlistModification } from 'scrivito_sdk/client';
import { isWidgetlistDiff } from 'scrivito_sdk/data';
import {
  BasicField,
  BasicWidget,
  getObjFrom,
  objSpaceScopeExcludingDeleted,
} from 'scrivito_sdk/models';

export interface PlacementModificationInfo {
  widget: BasicWidget;
  modification: PlacementModification;
}

export type PlacementModification = null | 'new' | 'deleted';

export function getPlacementModificationInfos(
  field: BasicField<'widgetlist'>,
  comparisonRange: ComparisonRange,
  containerPlacementModification: PlacementModification
): PlacementModificationInfo[] {
  const widgets = field.get();

  if (containerPlacementModification === 'deleted') {
    return toBlankPlacementModifications(widgets);
  }

  const diff = field.getDiff(comparisonRange);

  if (!isWidgetlistDiff(diff) || !diff.content) {
    return toBlankPlacementModifications(widgets);
  }

  const infos: PlacementModificationInfo[] = [];

  diff.content.forEach(([widgetlistModification, widgetId]) => {
    const info = getPlacementModificationInfo(
      field,
      comparisonRange,
      widgetlistModification,
      widgetId
    );

    if (info) infos.push(info);
  });

  return infos;
}

function toBlankPlacementModifications(widgets: BasicWidget[]) {
  return widgets.map((widget) => ({ widget, modification: null }));
}

function getPlacementModificationInfo(
  field: BasicField<'widgetlist'>,
  comparisonRange: ComparisonRange,
  widgetlistModification: WidgetlistModification,
  widgetId: string
): PlacementModificationInfo | null {
  if (widgetlistModification === '-') {
    const vanishedWidget = getVanishedWidget(
      comparisonRange,
      field.obj().id(),
      widgetId
    );

    if (!vanishedWidget) return null;

    const vanishedModification =
      field.getContainer() instanceof BasicWidget &&
      field.getContainer().modification(comparisonRange) === 'deleted'
        ? null
        : 'deleted';

    return { modification: vanishedModification, widget: vanishedWidget };
  }

  const widget = field.get().find((w) => w.id() === widgetId);
  if (!widget) return null;

  const modification = widgetlistModification === '=' ? null : 'new';
  return { modification, widget };
}

function getVanishedWidget(
  [from]: ComparisonRange,
  objId: string,
  widgetId: string
) {
  const fromObj = getObjFrom(objSpaceScopeExcludingDeleted(from), objId);
  return fromObj?.widget(widgetId);
}
