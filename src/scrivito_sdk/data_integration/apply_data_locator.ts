import { DataItem, DataScope } from 'scrivito_sdk/data_integration/data_class';
import { findMatchingItemElement } from 'scrivito_sdk/data_integration/data_context';
import { isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import {
  DataLocatorTransform,
  FilterTransformParams,
  ReferringTransformParams,
  isDataLocator,
  isFilterTransformParams,
  isReferringTransformParams,
} from 'scrivito_sdk/data_integration/data_locator';
import { DataLocatorError } from 'scrivito_sdk/data_integration/data_locator_error';
import {
  DataStack,
  itemElementToDataItem,
} from 'scrivito_sdk/data_integration/data_stack';
import { getDataClass } from 'scrivito_sdk/data_integration/get_data_class';

export function applyDataLocator(
  dataStack: DataStack | undefined,
  dataLocator: unknown
): DataScope | DataItem | null {
  if (!isDataLocator(dataLocator)) {
    throw new DataLocatorError('Data locator contains unknown elements');
  }

  const {
    source: [, { dataClass }],
    transforms,
  } = dataLocator;

  const dataScope = getDataClass(dataClass).all();
  if (!transforms) return dataScope;

  return transforms.reduce(
    (intermediateResult, transform) =>
      applyTransform(intermediateResult, transform, dataStack),
    dataScope
  );
}

function applyTransform(
  intermediateResult: DataScope | DataItem | null,
  [type, params]: DataLocatorTransform,
  dataStack: DataStack | undefined
) {
  if (!(intermediateResult instanceof DataScope)) {
    throw new DataLocatorError(
      'A scope-to-item transform is followed by a scope-to-scope transform'
    );
  }

  if (type === 'filter' && isFilterTransformParams(params)) {
    return applyFilterTransform(intermediateResult, params);
  }

  if (type === 'refersTo' && isReferringTransformParams(params)) {
    return applyRefersToTransform(intermediateResult, params, dataStack);
  }

  if (type === 'referredBy' && isReferringTransformParams(params)) {
    return applyReferredByTransform(intermediateResult, params, dataStack);
  }

  throw new DataLocatorError(`Unknown transform "${type}"`);
}

function applyFilterTransform(
  intermediateResult: DataScope,
  { attribute, equalsValue }: FilterTransformParams
) {
  return intermediateResult.filter(attribute, equalsValue);
}

function applyRefersToTransform(
  intermediateResult: DataScope,
  { dataClass, viaAttribute }: ReferringTransformParams,
  dataStack: DataStack | undefined
) {
  const itemElement = findMatchingItemElementOrThrow(dataClass, dataStack);
  return intermediateResult.filter(viaAttribute, itemElement._id);
}

function applyReferredByTransform(
  intermediateResult: DataScope,
  { dataClass, viaAttribute }: ReferringTransformParams,
  dataStack: DataStack | undefined
) {
  const itemElement = findMatchingItemElementOrThrow(dataClass, dataStack);
  const referringDataItem = itemElementToDataItem(itemElement);

  if (!referringDataItem) {
    throw new DataLocatorError(
      `No ${dataClass} item with ID ${itemElement._id} found`
    );
  }

  const referredDataItemId = referringDataItem.get(viaAttribute);

  return isValidDataId(referredDataItemId)
    ? intermediateResult.get(referredDataItemId)
    : null;
}

function findMatchingItemElementOrThrow(
  dataClass: string,
  dataStack: DataStack | undefined
) {
  if (!dataStack) {
    throw new DataLocatorError(`No ${dataClass} item found`);
  }

  const itemElement = findMatchingItemElement(dataClass, dataStack);

  if (!itemElement) {
    throw new DataLocatorError(`No ${dataClass} found`);
  }

  return itemElement;
}
