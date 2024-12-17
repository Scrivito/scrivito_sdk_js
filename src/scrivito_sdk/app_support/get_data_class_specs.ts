import union from 'lodash-es/union';

import {
  AttributeEditingConfig,
  AttributesEditingConfig,
  LocalizedValue,
} from 'scrivito_sdk/app_support/editing_config';
import { getEditingConfigFor } from 'scrivito_sdk/app_support/editing_config_store';
import {
  DataAttributeConfig,
  DataAttributeType,
  ExternalDataClass,
  NormalizedDataAttributeDefinition,
  NormalizedDataClassSchema,
  allExternalDataClasses,
  getNormalizedDataClassSchema,
  isReferenceAttributeConfig,
  isSingletonDataClass,
} from 'scrivito_sdk/data_integration';
import { ClassAttributeSpec, DataClassSpec } from 'scrivito_sdk/ui_interface';

export function getDataClassSpecs(): DataClassSpec[] {
  return allExternalDataClasses().map((dataClass) =>
    buildDataClassSpec(dataClass)
  );
}

export function computeDataAttributeNames(
  schema?: NormalizedDataClassSchema,
  editingConfig?: AttributesEditingConfig
): string[] {
  return union(
    schema ? Object.keys(schema) : [],
    editingConfig ? Object.keys(editingConfig) : []
  ).sort();
}

export function getDataAttributeTitle(
  editingConfig?: AttributeEditingConfig,
  config?: DataAttributeConfig
): string | undefined {
  return editingConfig?.title ?? config?.title;
}

function buildDataClassSpec(dataClass: ExternalDataClass): DataClassSpec {
  const name = dataClass.name();
  const editingConfig = getEditingConfigFor(name);
  const schema = getNormalizedDataClassSchema(name);

  return {
    type: 'ExternalData',
    name,
    title: editingConfig?.title,
    description: editingConfig?.description,
    attributes: buildDataClassAttributeSpecs(schema, editingConfig?.attributes),
    isSingleton: isSingletonDataClass(name),
  };
}

function buildDataClassAttributeSpecs(
  schema?: NormalizedDataClassSchema,
  editingConfig?: AttributesEditingConfig
): ClassAttributeSpec[] {
  return computeDataAttributeNames(schema, editingConfig).map((name) =>
    buildDataClassAttributeSpec(name, schema?.[name], editingConfig?.[name])
  );
}

function buildDataClassAttributeSpec(
  name: string,
  definition?: NormalizedDataAttributeDefinition,
  editingConfig?: AttributeEditingConfig
): ClassAttributeSpec {
  const [type, config] = definition || ['string'];
  const [values, valuesLocalization] = getValuesAndLocalization(type, config);

  return {
    name,
    type,
    values,
    valuesLocalization,
    title: getDataAttributeTitle(editingConfig, config),
    description: editingConfig?.description,
    referenceTo: getReferenceTo(type, config),
    reverseTitle: getReverseTitle(config),
  };
}

function getValuesAndLocalization(
  type: DataAttributeType,
  config?: DataAttributeConfig
) {
  return type === 'enum' &&
    config &&
    'values' in config &&
    config.values.length > 0
    ? toEnumValuesLocalization(config.values)
    : [];
}

function getReferenceTo(type: DataAttributeType, config?: DataAttributeConfig) {
  return (
    (type === 'reference' && config && 'to' in config && config.to) || undefined
  );
}

function getReverseTitle(config?: DataAttributeConfig) {
  return isReferenceAttributeConfig(config) ? config.reverseTitle : undefined;
}

function toEnumValuesLocalization(
  originalValues: Array<LocalizedValue | string>
) {
  return originalValues.reduce<[string[], LocalizedValue[]]>(
    ([values, localizedValues], currentValue) => {
      const value =
        typeof currentValue === 'string' ? currentValue : currentValue.value;

      const localizedValue =
        typeof currentValue === 'string'
          ? { title: currentValue, value: currentValue }
          : { title: currentValue.title, value: currentValue.value };

      return [
        [...values, value],
        [...localizedValues, localizedValue],
      ];
    },
    [[], []]
  );
}
