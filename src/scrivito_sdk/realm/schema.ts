import { BasicField } from 'scrivito_sdk/models';
import {
  AttributeTypeWithMandatoryOptions,
  NormalizedTypeInfo,
} from 'scrivito_sdk/models/type_info';
import {
  AppClass,
  AttributeType,
  Obj,
  ObjClass,
  Widget,
  WidgetClass,
} from 'scrivito_sdk/realm';

export interface ConvenienceObjClassDefinition {
  attributes?: CustomAttributesDefinition;
  extend?: ObjClass;
  extractTextAttributes?: string[];
  name?: string;
  onlyAsRoot?: boolean;
  onlyChildren?: string[] | string;
  onlyInside?: string[] | string;
  validAsRoot?: boolean;
}

export interface ConvenienceWidgetClassDefinition {
  attributes?: CustomAttributesDefinition;
  extend?: WidgetClass;
  extractTextAttributes?: string[];
  name?: string;
  onlyChildren?: undefined;
  onlyInside?: string[] | string;
}

interface CustomAttributesDefinition {
  [attributeName: string]: CustomAttributeDefinition;
}

// All attributes which only their type can be defined (no options).
type AttributeTypesWithoutOptions = Exclude<
  AttributeType,
  keyof AttributeDefinitionOptionsMapping
>;

// All attributes which can be defined with or without options.
// See AttributeDefinitionOptionsMapping for the available options.
type AttributeTypesWithOptionalOptions = Exclude<
  AttributeType,
  AttributeTypeWithMandatoryOptions | AttributeTypesWithoutOptions
>;

type CustomAttributeDefinition =
  | AttributeTypesWithoutOptions
  | AttributeTypesWithOptionalOptions
  | {
      [Type in keyof AttributeDefinitionOptionsMapping]: [
        Type,
        AttributeDefinitionOptionsMapping[Type]
      ];
    }[keyof AttributeDefinitionOptionsMapping];

type AttributeDefinitionOptionsMapping = {
  enum: { values: string[] };
  multienum: { values: string[] };
  reference: { only: string | string[] };
  referencelist: { only: string | string[] };
  widgetlist: { only: string | string[] };
};

export interface AttributesDefinition {
  [key: string]: NormalizedTypeInfo<AttributeType>;
}

interface ObjClassDefinition {
  attributes: AttributesDefinition;
  extend?: ObjClass;
  extractTextAttributes?: string[];
  name?: string;
  onlyAsRoot?: boolean;
  onlyChildren?: string[];
  onlyInside?: string[];
  validAsRoot?: boolean;
}

interface WidgetClassDefinition {
  attributes: AttributesDefinition;
  extend?: WidgetClass;
  extractTextAttributes?: string[];
  name?: string;
  onlyAsRoot?: boolean;
  onlyChildren?: undefined;
  onlyInside?: string[];
  validAsRoot?: boolean;
}

export class Schema {
  static forInstance(model: Obj | Widget): Schema | undefined {
    return Schema.forClass(model.constructor as ObjClass | WidgetClass);
  }

  static forClass(klass: ObjClass | WidgetClass): Schema | undefined {
    return klass._scrivitoPrivateSchema;
  }

  static basicFieldFor<T extends AttributeType>(
    model: Obj | Widget,
    attributeName: string
  ): BasicField<T> | null {
    const schema = Schema.forInstance(model);

    if (!schema) return null;

    const typeInfo = schema.attribute(attributeName);

    if (!typeInfo) return null;

    return new BasicField<T>(
      model._scrivitoPrivateContent,
      attributeName,
      typeInfo as NormalizedTypeInfo<T>
    );
  }

  private readonly definition: ObjClassDefinition | WidgetClassDefinition;

  constructor(definition: ConvenienceObjClassDefinition, parent: ObjClass);

  constructor(
    definition: ConvenienceWidgetClassDefinition,
    parent: WidgetClass
  );

  constructor(
    definition:
      | ConvenienceObjClassDefinition
      | ConvenienceWidgetClassDefinition,
    parent: ObjClass | WidgetClass
  ) {
    const privateSchema = parent._scrivitoPrivateSchema;
    const attributes: AttributesDefinition = privateSchema
      ? { ...privateSchema.attributes }
      : {};

    const definitionAttributes = definition.attributes;

    if (definitionAttributes) {
      Object.keys(definitionAttributes).forEach((name) => {
        const attrDefinition = definitionAttributes[name];

        attributes[name] = normalizeAttributeDefinition(attrDefinition);
      });
    }

    const {
      onlyInside: rawOnlyInside,
      onlyChildren: rawOnlyChildren,
      ...otherDefinitions
    } = definition;

    const onlyChildren = normalizeToStringArray(rawOnlyChildren);
    const onlyInside = normalizeToStringArray(rawOnlyInside);

    if (onlyChildren) {
      this.definition = {
        ...(otherDefinitions as ConvenienceObjClassDefinition),
        attributes,
        onlyChildren,
        onlyInside,
      };
    } else {
      this.definition = { ...otherDefinitions, attributes, onlyInside };
    }
  }

  get attributes(): AttributesDefinition {
    return this.definition.attributes;
  }

  get extractTextAttributes(): string[] {
    return this.definition.extractTextAttributes || [];
  }

  get name(): string | undefined {
    return this.definition.name;
  }

  get onlyInside(): string[] | undefined {
    return this.definition.onlyInside;
  }

  get onlyChildren(): string[] | undefined {
    return this.definition.onlyChildren;
  }

  get validAsRoot(): boolean | undefined {
    return this.definition.validAsRoot;
  }

  get onlyAsRoot(): boolean | undefined {
    return this.definition.onlyAsRoot;
  }

  attribute(name: string): NormalizedTypeInfo<AttributeType> | undefined {
    return this.attributes[name];
  }

  isBinary() {
    const blobDefinition = this.attribute('blob');
    if (!blobDefinition) return false;

    return blobDefinition[0] === 'binary';
  }
}

export function isAppClass(object: object): object is AppClass {
  return !!(object && (object as AppClass)._scrivitoPrivateSchema);
}

function normalizeAttributeDefinition(
  attrDefinition: CustomAttributeDefinition
): NormalizedTypeInfo<AttributeType> {
  if (typeof attrDefinition === 'string') {
    return [attrDefinition];
  }

  if (attrDefinition[0] === 'enum' || attrDefinition[0] === 'multienum') {
    return [attrDefinition[0], attrDefinition[1]];
  }

  const { only, ...otherOptions } = attrDefinition[1];
  const validClasses = typeof only === 'string' ? [only] : only;
  return [attrDefinition[0], { ...otherOptions, validClasses }];
}

function normalizeToStringArray(value: string | string[] | undefined) {
  if (typeof value === 'string') return [value];

  if (value?.length) return value;
}
