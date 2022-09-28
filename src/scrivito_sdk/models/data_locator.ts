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

type DataLocatorTransform = [
  DataLocatorTransformType,
  DataLocatorTransformParams
];

type DataLocatorTransformType = FilterTransformType | RefersToTransformType;
type DataLocatorTransformParams =
  | FilterTransformParams
  | RefersToTransformParams;

type FilterTransformType = 'filter';

export interface FilterTransformParams {
  attribute: string;
  equalsValue: string;
}

type RefersToTransformType = 'refersTo';

export interface RefersToTransformParams {
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
    return isFilterDataTransformParams(transformParams);
  }

  if (transformType === 'refersTo') {
    return isRefersToDataTransformParams(transformParams);
  }

  return false;
}

export function isFilterDataTransformParams(
  transformParams: unknown
): transformParams is FilterTransformParams {
  if (!isObject(transformParams)) return false;

  const filterTransformParams = transformParams as FilterTransformParams;

  return (
    typeof filterTransformParams.attribute === 'string' &&
    typeof filterTransformParams.equalsValue === 'string'
  );
}

export function isRefersToDataTransformParams(
  transformParams: unknown
): transformParams is RefersToTransformParams {
  if (!isObject(transformParams)) return false;

  const refersToTransformParams = transformParams as RefersToTransformParams;

  return (
    typeof refersToTransformParams.dataClass === 'string' &&
    typeof refersToTransformParams.viaAttribute === 'string'
  );
}
