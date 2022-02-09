import { BasicObj, BasicWidget } from 'scrivito_sdk/models';
import { schemaFromBasicObjOrWidget } from 'scrivito_sdk/realm';

export function subWidgets(root: BasicObj | BasicWidget): BasicWidget[] {
  const rootSchema = schemaFromBasicObjOrWidget(root);
  if (!rootSchema) return [];

  const attributes = rootSchema.attributes();

  return Object.keys(attributes).reduce((memo, attrName) => {
    if (attributes[attrName][0] !== 'widgetlist') return memo;
    const widgets = root.get(attrName, 'widgetlist');

    return Array.prototype.concat(
      memo,
      ...widgets.map((widget) => [widget, ...subWidgets(widget)])
    );
  }, []);
}
