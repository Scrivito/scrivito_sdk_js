import { contains } from 'underscore';

import { ArgumentError } from 'scrivito_sdk/common';
import { AttributeType, NormalizedTypeInfo } from 'scrivito_sdk/models';
import { Schema } from './schema';

const ATTRIBUTE_TYPES_WHITELIST = ['string', 'html', 'widgetlist'];

export function assertValidObjExtractTextAttributes(schema: Schema): void {
  schema.extractTextAttributes.forEach((attribute) => {
    if (attribute.substring(0, 5) === 'blob:') {
      return assertValidBinaryAttribute(schema, attribute);
    }
    assertValidExtractTextAttribute(attribute, schema.attribute(attribute));
  });
}

export function assertValidWidgetExtractTextAttributes(schema: Schema): void {
  schema.extractTextAttributes.forEach((attribute) => {
    if (attribute.substring(0, 5) === 'blob:') {
      throw new ArgumentError(
        `Invalid value for "extractTextAttributes": ${attribute} is not supported.`
      );
    }
    assertValidExtractTextAttribute(attribute, schema.attribute(attribute));
  });
}

function assertValidBinaryAttribute(
  schema: Schema,
  extractTextAttribute: string
): void {
  if (extractTextAttribute === 'blob:text') {
    if (schema.isBinary()) return;

    throw new ArgumentError(
      'Invalid value for "extractTextAttributes": blob:text is only supported for binary objs.'
    );
  }

  throw new ArgumentError(
    `Invalid value for "extractTextAttributes": ${extractTextAttribute} is not supported.`
  );
}

function assertValidExtractTextAttribute(
  attribute: string,
  definition: NormalizedTypeInfo<AttributeType> | undefined
): void {
  if (!definition) {
    throw new ArgumentError(
      `Invalid value for "extractTextAttributes": Attribute ${attribute} is not defined.`
    );
  }

  const [attributeType] = definition;
  if (contains(ATTRIBUTE_TYPES_WHITELIST, attributeType)) return;

  throw new ArgumentError(
    `Invalid value for "extractTextAttributes": Attribute ${attribute} of type ${attributeType} is not supported.`
  );
}
