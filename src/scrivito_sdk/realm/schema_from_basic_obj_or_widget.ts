import { BasicObj, BasicWidget } from 'scrivito_sdk/models';
import { Schema, getClass } from 'scrivito_sdk/realm';

export function schemaFromBasicObjOrWidget(
  objOrWidget: BasicObj | BasicWidget
): Schema | undefined {
  const className = objOrWidget.objClass();
  if (!className) return;

  const widgetClass = getClass(className);
  if (!widgetClass) return;

  return Schema.forClass(widgetClass);
}
