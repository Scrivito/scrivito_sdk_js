import { DataScope, getDataClass } from 'scrivito_sdk/app_support/data_class';
import { findMatchingDataItemEntry } from 'scrivito_sdk/app_support/data_context';
import { DataStack } from 'scrivito_sdk/app_support/data_stack';
import {
  DataLocatorError,
  FilterTransformParams,
  RefersToTransformParams,
  isDataLocator,
  isFilterDataTransformParams,
  isRefersToDataTransformParams,
} from 'scrivito_sdk/models';
import { useDataStack } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataLocator(dataLocator: unknown): DataScope {
  const dataStack = useDataStack();

  if (!isDataLocator(dataLocator)) {
    throw new DataLocatorError('Data locator contains unknown elements');
  }

  const {
    source: [, { dataClass }],
    transforms,
  } = dataLocator;

  let dataScope = getDataClass(dataClass).all();

  if (transforms) {
    transforms.forEach(([type, params]) => {
      if (type === 'filter' && isFilterDataTransformParams(params)) {
        dataScope = applyFilterTransform(dataScope, params);
      }

      if (type === 'refersTo' && isRefersToDataTransformParams(params)) {
        dataScope = applyRefersToTransform(dataScope, params, dataStack);
      }
    });
  }

  return dataScope;
}

function applyFilterTransform(
  dataScope: DataScope,
  params: FilterTransformParams
) {
  const { attribute, equalsValue } = params;
  return dataScope.filter(attribute, equalsValue);
}

function applyRefersToTransform(
  dataScope: DataScope,
  params: RefersToTransformParams,
  dataStack: DataStack | undefined
) {
  const { dataClass, viaAttribute } = params;

  if (!dataStack) {
    throw new DataLocatorError(`No ${dataClass} found`);
  }

  const stackItem = findMatchingDataItemEntry(dataClass, dataStack);

  if (!stackItem) {
    throw new DataLocatorError(`No ${dataClass} found`);
  }

  return dataScope.filter(viaAttribute, stackItem._id);
}
