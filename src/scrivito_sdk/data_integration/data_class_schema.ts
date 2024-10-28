import mapValues from 'lodash-es/mapValues';

import { isObject, isPromise, logError } from 'scrivito_sdk/common';
import { createLoadableCollection } from 'scrivito_sdk/loadable';
import { createStateContainer } from 'scrivito_sdk/state';

export type DataClassAttributes =
  | DataClassSchema
  | Promise<DataClassSchema>
  | DataSchemaCallback;

type DataSchemaCallback = () => Promise<DataClassSchema>;

export interface DataClassSchemaResponse {
  attributes: DataClassSchema;
}

export interface DataClassSchema {
  [attributeName: string]: DataAttributeDefinition;
}

export type DataAttributeDefinition =
  | DataAttributeDefinitionWithOptionalConfig
  | DataAttributeDefinitionWithConfig;

export interface NormalizedDataClassSchema {
  [attributeName: string]: NormalizedDataAttributeDefinition;
}

export type NormalizedDataAttributeDefinition =
  | [DataAttributeDefinitionWithOptionalConfig, {}]
  | NormalizedDataAttributeDefinitionWithConfig;

export type NormalizedDataAttributeDefinitionWithConfig = {
  [T in keyof NormalizedDataAttributeConfigs]: [
    T,
    NormalizedDataAttributeConfigs[T]
  ];
}[keyof NormalizedDataAttributeConfigs];

export type NormalizedDataAttributeConfigs = DataAttributeConfigs & {
  enum: LocalizedEnumAttributeConfig;
};

export interface LocalizedEnumAttributeConfig extends EnumAttributeConfig {
  values: Array<LocalizedEnumValueConfig>;
}

export type DataAttributeConfigs = {
  boolean: LocalizedAttributeConfig;
  date: LocalizedAttributeConfig;
  enum: EnumAttributeConfig;
  number: LocalizedAttributeConfig;
  reference: ReferenceAttributeConfig;
  string: LocalizedAttributeConfig;
};

type LocalizedAttributeConfig = { title?: string };

export interface EnumAttributeConfig {
  values: Array<EnumValueConfig>;
  title?: string;
}

export interface ReferenceAttributeConfig {
  to: DataClassName;
  title?: string;
  reverseTitle?: string;
}

type DataAttributeDefinitionWithOptionalConfig = Exclude<
  DataAttributeType,
  'enum' | 'reference'
>;

export type DataAttributeDefinitionWithConfig = {
  [T in keyof DataAttributeConfigs]: [T, DataAttributeConfigs[T]];
}[keyof DataAttributeConfigs];

export type DataAttributeConfig = DataAttributeDefinitionWithConfig[1];

export type DataAttributeType =
  | 'boolean'
  | 'date'
  | 'enum'
  | 'number'
  | 'reference'
  | 'string';

type EnumValueConfig = string | LocalizedEnumValueConfig;
type LocalizedEnumValueConfig = { value: string; title: string };
type DataClassName = string;

function isDataAttributeType(
  attributeType: unknown
): attributeType is DataAttributeType {
  return (
    typeof attributeType === 'string' &&
    ['boolean', 'date', 'enum', 'number', 'reference', 'string'].includes(
      attributeType
    )
  );
}

export function registerDataClassSchema(
  dataClassName: string,
  attributes: DataClassAttributes = {}
): void {
  const schemata = { ...schemataState.get() };
  schemata[dataClassName] = wrapInCallback(attributes);
  schemataState.set(schemata);
  invalidateSchemataCollection();
}

export function getDataClassSchema(
  dataClassName: string
): DataClassSchema | undefined {
  return schemataCollection.get(dataClassName).get();
}

export function getNormalizedDataClassSchema(
  dataClassName: string
): NormalizedDataClassSchema {
  return mapValues(
    getDataClassSchema(dataClassName),
    normalizeDataAttributeDefinition
  );
}

// For test purpose only
export function unregisterDataClassSchema(dataClassName: string): void {
  const schemata = { ...schemataState.get() };
  delete schemata[dataClassName];
  schemataState.set(schemata);
  invalidateSchemataCollection();
}

interface Schemata {
  [dataClassName: string]: DataSchemaCallback;
}

const schemataState = createStateContainer<Schemata>();
const counterState = createStateContainer<number>();

const schemataCollection = createLoadableCollection({
  name: 'dataClassSchema',
  loadElement: (dataClassName: string) => ({
    loader() {
      const callback = schemataState.get()?.[dataClassName];
      return callback ? callback() : Promise.resolve({});
    },
    invalidation: () => getCounter().toString(),
  }),
});

function invalidateSchemataCollection() {
  counterState.set(getCounter() + 1);
}

function getCounter() {
  return counterState.get() || 0;
}

function normalizeDataAttributeDefinition(
  definition: DataAttributeDefinition
): NormalizedDataAttributeDefinition {
  if (typeof definition === 'string') return [definition, {}];

  const [type, config] = definition;
  if (type === 'enum') return [type, normalizeEnumValueConfig(config)];

  return definition;
}

function normalizeEnumValueConfig({ title, values }: EnumAttributeConfig) {
  const config: LocalizedEnumAttributeConfig = {
    values: values.map((value) =>
      typeof value === 'string' ? { value, title: value } : value
    ),
  };

  if (title) config.title = title;

  return config;
}

function wrapInCallback(attributes: DataClassAttributes): DataSchemaCallback {
  if (attributes instanceof Function) return attributes;
  if (isPromise(attributes)) return () => attributes;

  return () => Promise.resolve(attributes);
}

export function extractDataClassSchemaResponse(
  input: unknown
): DataClassSchemaResponse {
  const response = { attributes: {} };

  if (!isObject(input)) {
    logError(
      `Invalid schema response: expected an object: ${JSON.stringify(input)}`
    );

    return response;
  }

  if (!('attributes' in input)) {
    logError(
      `Invalid schema response: no "attributes" key: ${JSON.stringify(input)}`
    );

    return response;
  }

  response.attributes = extractDataClassSchema(input.attributes);

  return response;
}

function extractDataClassSchema(input: unknown): DataClassSchema {
  const schema: DataClassSchema = {};

  if (!isObject(input)) {
    logError(
      `Invalid schema response: expected "attributes" to be an object: ${JSON.stringify(
        input
      )}`
    );

    return schema;
  }

  Object.entries(input).forEach(([attributeName, maybeDefinition]) => {
    if (attributeName === '_id') {
      logSchemaError(
        attributeName,
        maybeDefinition,
        'Key "_id" is not allowed in schema attributes'
      );
    } else {
      if (typeof maybeDefinition === 'string') {
        if (isDataAttributeDefinitionWithOptionalConfig(maybeDefinition)) {
          schema[attributeName] = maybeDefinition;
        } else {
          logSchemaError(
            attributeName,
            maybeDefinition,
            'Unknown attribute type.'
          );
        }
      } else if (Array.isArray(maybeDefinition)) {
        const definition = extractDataAttributeDefinitionWithConfig(
          attributeName,
          maybeDefinition
        );

        if (definition) {
          schema[attributeName] = definition;
        }
      } else {
        logSchemaError(
          attributeName,
          maybeDefinition,
          'Expected an array or a string'
        );
      }
    }
  });

  return schema;
}

function isDataAttributeDefinitionWithOptionalConfig(
  definition: unknown
): definition is DataAttributeDefinitionWithOptionalConfig {
  return (
    typeof definition === 'string' &&
    ['boolean', 'date', 'number', 'string'].includes(definition)
  );
}

function extractDataAttributeDefinitionWithConfig(
  attributeName: string,
  definition: unknown[]
): DataAttributeDefinitionWithConfig | undefined {
  if (definition.length < 2) {
    logSchemaError(
      attributeName,
      definition,
      'Expected an array with two elements.'
    );

    return;
  }

  const [attributeType, maybeConfig] = definition;

  if (!isDataAttributeType(attributeType)) {
    logSchemaError(attributeName, attributeType, 'Unknown attribute type.');
    return;
  }

  if (attributeType === 'enum') {
    if (isEnumAttributeConfig(maybeConfig)) {
      return [attributeType, maybeConfig];
    }

    logSchemaError(
      attributeName,
      maybeConfig,
      'Invalid "enum" attribute config.'
    );
  } else if (attributeType === 'reference') {
    const config = isReferenceAttributeConfig(maybeConfig)
      ? maybeConfig
      : undefined;

    if (config) {
      return [attributeType, config];
    }

    logSchemaError(
      attributeName,
      maybeConfig,
      'Invalid "reference" attribute config.'
    );
  } else {
    const config = isLocalizedAttributeConfig(maybeConfig)
      ? maybeConfig
      : undefined;

    if (config) {
      return [attributeType, config];
    }

    logSchemaError(attributeName, maybeConfig, 'Invalid localization.');
  }
}

export function isEnumAttributeConfig(
  config: unknown
): config is EnumAttributeConfig {
  return (
    isObject(config) &&
    titleIsValidOrNotPresent(config) &&
    'values' in config &&
    Array.isArray(config.values) &&
    config.values.every(
      (valueOrConfig) =>
        (typeof valueOrConfig === 'string' && valueOrConfig.length) ||
        isLocalizedEnumValueConfig(valueOrConfig)
    )
  );
}

function isLocalizedEnumValueConfig(
  config: unknown
): config is LocalizedEnumValueConfig {
  return (
    isObject(config) &&
    'value' in config &&
    typeof config.value === 'string' &&
    !!config.value.length &&
    titleIsValidOrNotPresent(config)
  );
}

function isReferenceAttributeConfig(
  config: unknown
): config is ReferenceAttributeConfig {
  return (
    isObject(config) &&
    'to' in config &&
    typeof config.to === 'string' &&
    titleIsValidOrNotPresent(config) &&
    (!('reverseTitle' in config) || typeof config.reverseTitle === 'string')
  );
}

function isLocalizedAttributeConfig(
  config: unknown
): config is LocalizedAttributeConfig {
  return (
    isObject(config) &&
    (!Object.keys(config).length || titleIsValidOrNotPresent(config))
  );
}

function titleIsValidOrNotPresent(object: Object) {
  return !('title' in object) || typeof object.title === 'string';
}

function logSchemaError(
  attributeName: string,
  actual: unknown,
  details?: string
) {
  logError(
    `Invalid schema definition for attribute "${attributeName}": ${JSON.stringify(
      actual
    )}${details ? `\nDetails: ${details}` : ''}`
  );
}
