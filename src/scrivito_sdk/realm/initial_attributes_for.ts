import { AttributeValue } from './attribute_types';
import { initialContentFor } from './initial_content_registry';
import { Schema } from './schema';

interface Attributes {
  [key: string]: AttributeValue | undefined;
}

export function initialAttributesFor(
  providedAttributes: object,
  schema: Schema,
  appClassName: string
): Attributes {
  const initialAttributes: Attributes = {};

  Object.keys(schema.attributes).forEach((attributeName) => {
    if (
      !Object.prototype.hasOwnProperty.call(providedAttributes, attributeName)
    ) {
      const initialValue = initialContentFor(appClassName, attributeName);

      if (initialValue !== undefined) {
        initialAttributes[attributeName] = initialValue;
      }
    }
  });

  return initialAttributes;
}
