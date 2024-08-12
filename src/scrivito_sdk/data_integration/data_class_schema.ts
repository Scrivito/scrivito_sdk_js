import mapValues from 'lodash-es/mapValues';

import { isObject, isPromise } from 'scrivito_sdk/common';
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
  | DataAttributeDefinitionWithConfig;

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
  [T in keyof DataAttributeConfigs]: readonly [T, DataAttributeConfigs[T]];
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

export function registerDataClassSchema(
  dataClassName: string,
  attributes: DataClassAttributes = {}
): void {
  const schemata = { ...schemataState.get() };
  schemata[dataClassName] = wrapInCallback(attributes);
  schemataState.set(schemata);
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
}

interface Schemata {
  [dataClassName: string]: DataSchemaCallback;
}

const schemataState = createStateContainer<Schemata>();

const schemataCollection = createLoadableCollection({
  name: 'dataClassSchema',
  loadElement: (dataClassName: string) => ({
    loader() {
      const callback = schemataState.get()?.[dataClassName];
      return callback ? callback() : Promise.resolve({});
    },
  }),
});

function normalizeDataAttributeDefinition(
  definition: DataAttributeDefinition
): NormalizedDataAttributeDefinition {
  return typeof definition === 'string' ? [definition, {}] : definition;
}

function wrapInCallback(attributes: DataClassAttributes): DataSchemaCallback {
  if (attributes instanceof Function) return attributes;
  if (isPromise(attributes)) return () => attributes;

  return () => Promise.resolve(attributes);
}

export function isDataClassSchemaResponse(
  response: unknown
): response is DataClassSchemaResponse {
  return (
    isObject(response) &&
    'attributes' in response &&
    isDataClassSchema(response.attributes)
  );
}

function isDataClassSchema(schema: unknown): schema is DataClassSchema {
  if (!isObject(schema)) return false;

  return Object.values(schema).every(isDataAttributeDefinition);
}

function isDataAttributeDefinition(
  definition: unknown
): definition is DataAttributeDefinition {
  return (
    isDataAttributeDefinitionWithOptionalConfig(definition) ||
    isDataAttributeDefinitionWithConfig(definition)
  );
}

function isDataAttributeDefinitionWithOptionalConfig(
  definition: unknown
): definition is DataAttributeDefinitionWithOptionalConfig {
  return (
    typeof definition === 'string' &&
    ['boolean', 'date', 'number', 'string'].includes(definition)
  );
}

function isDataAttributeDefinitionWithConfig(
  definition: unknown
): definition is DataAttributeDefinitionWithConfig {
  if (!Array.isArray(definition) || definition.length !== 2) return false;

  const [attributeType, config] = definition;

  if (
    typeof attributeType !== 'string' ||
    !['string', 'number', 'boolean', 'date', 'enum', 'reference'].includes(
      attributeType
    )
  ) {
    return false;
  }

  if (attributeType === 'enum') {
    return isEnumAttributeConfig(config);
  }

  if (attributeType === 'reference') {
    return isReferenceAttributeConfig(config);
  }

  return isLocalizedAttributeConfig(config);
}

export function isEnumAttributeConfig(
  config: unknown
): config is EnumAttributeConfig {
  return (
    isObject(config) &&
    objectHasOnlyKeysFromList(config, ['values', 'title']) &&
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
    objectHasOnlyKeysFromList(config, ['value', 'title']) &&
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
    objectHasOnlyKeysFromList(config, ['to', 'title', 'reverseTitle']) &&
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
    (!Object.keys(config).length ||
      (objectHasOnlyKeysFromList(config, ['title']) &&
        titleIsValidOrNotPresent(config)))
  );
}

function objectHasOnlyKeysFromList(object: Object, keys: string[]): boolean {
  return Object.keys(object).every((key) => keys.includes(key));
}

function titleIsValidOrNotPresent(object: Object) {
  return !('title' in object) || typeof object.title === 'string';
}
