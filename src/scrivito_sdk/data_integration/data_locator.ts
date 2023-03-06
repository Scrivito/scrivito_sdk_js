import { isObject } from 'underscore';

export interface DataLocator {
  source: DataLocatorSource;
  transforms?: DataLocatorTransform[];
}

type DataLocatorSource = [DataLocatorSourceType, DataLocatorSourceParams];
type DataLocatorSourceType = 'all';

const DATA_LOCATOR_SOURCE_TYPES: DataLocatorSourceType[] = ['all'];

interface DataLocatorSourceParams {
  dataClass: string;
}

export type DataLocatorTransform = [
  DataLocatorTransformType,
  DataLocatorTransformParams
];

type DataLocatorTransformType = FilterTransformType | ReferringTransformType;

type DataLocatorTransformParams =
  | FilterTransformParams
  | ReferringTransformParams;

type FilterTransformType = 'filter';

export interface FilterTransformParams {
  attribute: string;
  equalsValue: string;
}

type ReferringTransformType = 'refersTo' | 'referredBy';

export interface ReferringTransformParams {
  dataClass: string;
  viaAttribute: string;
}

export function isDataLocator(
  dataLocator: unknown
): dataLocator is DataLocator {
  if (!isObject(dataLocator)) return false;

  const { source, transforms } = dataLocator as DataLocator;

  return isDataLocatorSource(source) && isDataLocatorTransforms(transforms);
}

function isDataLocatorSource(
  dataLocatorSource: unknown
): dataLocatorSource is DataLocatorSource {
  if (!Array.isArray(dataLocatorSource)) return false;

  const [dataLocatorSourceType, dataLocatorSourceParams] = dataLocatorSource;

  return (
    isDataLocatorSourceType(dataLocatorSourceType) &&
    isDataLocatorSourceParams(dataLocatorSourceParams)
  );
}

function isDataLocatorTransforms(
  dataLocatorTransforms: unknown
): dataLocatorTransforms is DataLocatorTransform[] {
  return (
    dataLocatorTransforms === undefined ||
    (Array.isArray(dataLocatorTransforms) &&
      dataLocatorTransforms.every(isDataLocatorTransform))
  );
}

function isDataLocatorSourceType(
  dataLocatorSourceType: unknown
): dataLocatorSourceType is DataLocatorSourceType {
  return (
    typeof dataLocatorSourceType === 'string' &&
    DATA_LOCATOR_SOURCE_TYPES.includes(
      dataLocatorSourceType as DataLocatorSourceType
    )
  );
}

function isDataLocatorSourceParams(
  dataLocatorSourceParams: unknown
): dataLocatorSourceParams is DataLocatorSourceParams {
  return (
    isObject(dataLocatorSourceParams) &&
    typeof (dataLocatorSourceParams as DataLocatorSourceParams).dataClass ===
      'string'
  );
}

function isDataLocatorTransform(
  dataLocatorTransform: unknown
): dataLocatorTransform is DataLocatorTransform {
  if (
    !Array.isArray(dataLocatorTransform) ||
    dataLocatorTransform.length !== 2
  ) {
    return false;
  }

  const [transformType, transformParams] = dataLocatorTransform;

  if (transformType === 'filter') {
    return isFilterTransformParams(transformParams);
  }

  if (transformType === 'refersTo' || transformType === 'referredBy') {
    return isReferringTransformParams(transformParams);
  }

  return false;
}

export function isFilterTransformParams(
  transformParams: unknown
): transformParams is FilterTransformParams {
  if (!isObject(transformParams)) return false;

  const filterTransformParams = transformParams as FilterTransformParams;

  return (
    typeof filterTransformParams.attribute === 'string' &&
    typeof filterTransformParams.equalsValue === 'string'
  );
}

export function isReferringTransformParams(
  transformParams: unknown
): transformParams is ReferringTransformParams {
  if (!isObject(transformParams)) return false;

  const referringTransformParams = transformParams as ReferringTransformParams;

  return (
    typeof referringTransformParams.dataClass === 'string' &&
    typeof referringTransformParams.viaAttribute === 'string'
  );
}
