import { AttributeType } from 'scrivito_sdk/models/basic_attribute_types';

export type AttributeTypeWithMandatoryOptions = 'enum' | 'multienum';

interface NormalizedTypeOptionsMapping {
  enum: { values: string[] };
  multienum: { values: string[] };
  reference: { validClasses: string[] };
  referencelist: { validClasses: string[] };
  widgetlist: { validClasses: string[] };
}

export type NormalizedTypeInfo<
  Type extends AttributeType
> = Type extends keyof NormalizedTypeOptionsMapping
  ? TypeInfoWithOptions<Type>
  : [Type];

type TypeInfoWithOptions<
  Type extends keyof NormalizedTypeOptionsMapping
> = Type extends AttributeTypeWithMandatoryOptions
  ? [Type, NormalizedTypeOptionsMapping[Type]]
  : [Type, NormalizedTypeOptionsMapping[Type]] | [Type];

export type TypeInfo<Type extends AttributeType> =
  | NormalizedTypeInfo<Type>
  | Exclude<Type, AttributeTypeWithMandatoryOptions>;
