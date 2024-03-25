import {
  DataLocatorFilter,
  DataLocatorOperatorFilter,
  DataLocatorValueFilter,
  DataLocatorValueVia,
  DataLocatorValueViaFilter,
} from 'scrivito_sdk/client';
import { ArgumentError } from 'scrivito_sdk/common';
import {
  DataScope,
  DataScopeError,
} from 'scrivito_sdk/data_integration/data_class';
import {
  findItemInDataStackAndGlobalData,
  findScopeInDataStackAndGlobalData,
} from 'scrivito_sdk/data_integration/data_context';
import { isValidDataId } from 'scrivito_sdk/data_integration/data_id';
import {
  DataStack,
  isDataScopePojo,
} from 'scrivito_sdk/data_integration/data_stack';
import {
  dataItemFromPojo,
  dataScopeFromPojo,
} from 'scrivito_sdk/data_integration/deserialization';
import { EmptyDataScope } from 'scrivito_sdk/data_integration/empty_data_scope';
import { getDataClassOrThrow } from 'scrivito_sdk/data_integration/get_data_class';
import {
  DataLocator,
  isDataLocatorOperatorFilter,
  isDataLocatorValueViaFilter,
} from 'scrivito_sdk/models';

export function applyDataLocator(
  dataStack: DataStack | undefined,
  dataLocator: DataLocator | null | undefined
): DataScope {
  if (!dataLocator) return new EmptyDataScope();

  const className = dataLocator.class();
  if (className === null) return new EmptyDataScope();

  try {
    return dataLocator.viaRef()
      ? findMatchingDataScopeOrThrow(className, dataStack)
      : applyDataLocatorDefinition(className, dataStack, dataLocator);
  } catch (error) {
    if (error instanceof ArgumentError) {
      return new EmptyDataScope(new DataScopeError(error.message));
    }

    throw error;
  }
}

function applyDataLocatorDefinition(
  className: string,
  dataStack: DataStack | undefined,
  dataLocator: DataLocator
): DataScope {
  let dataScope = getDataClassOrThrow(className).all();

  const query = dataLocator.query();

  if (query) {
    dataScope = query.reduce(
      (scope, filter) => applyFilter(scope, filter, dataStack),
      dataScope
    );
  }

  const orderBy = dataLocator.orderBy();

  if (orderBy) {
    dataScope = dataScope.transform({ order: orderBy });
  }

  const size = dataLocator.size();

  if (size !== undefined) {
    dataScope = dataScope.transform({ limit: size });
  }

  return dataScope;
}

function applyFilter(
  scope: DataScope,
  filter: DataLocatorFilter,
  dataStack: DataStack | undefined
) {
  if (isDataLocatorOperatorFilter(filter)) {
    return applyOperatorFilter(scope, filter);
  }

  if (isDataLocatorValueViaFilter(filter)) {
    return applyValueViaFilter(scope, filter, dataStack);
  }

  return applyValueFilter(scope, filter);
}

function applyOperatorFilter(
  scope: DataScope,
  { field, operator, value }: DataLocatorOperatorFilter
) {
  return scope.transform({ filters: { [field]: { operator, value } } });
}

function applyValueFilter(
  scope: DataScope,
  { field, value }: DataLocatorValueFilter
) {
  return scope.transform({ filters: { [field]: value } });
}

function applyValueViaFilter(
  scope: DataScope,
  { field, value_via: valueVia }: DataLocatorValueViaFilter,
  dataStack: DataStack | undefined
) {
  const value = resolveValueVia(valueVia, dataStack);

  if (field === '_id' && !isValidDataId(value)) {
    throw new ArgumentError(`${value} is not a valid data ID`);
  }

  return applyValueFilter(scope, { field, value });
}

function resolveValueVia(
  { class: viaClass, field: viaField }: DataLocatorValueVia,
  dataStack: DataStack | undefined
) {
  const dataItem = findMatchingDataItemOrThrow(viaClass, dataStack);
  if (viaField === '_id') return dataItem.id();

  const value = dataItem.get(viaField);

  if (typeof value !== 'string') {
    throw new ArgumentError(
      `Attribute ${viaField} of ${viaClass} must be a string`
    );
  }

  return value;
}

function findMatchingDataItemOrThrow(
  viaClass: string,
  dataStack: DataStack | undefined
) {
  const itemElement = findMatchingItemElementOrThrow(viaClass, dataStack);
  const dataItem = dataItemFromPojo(itemElement);

  if (!dataItem) {
    throw new ArgumentError(
      `No ${viaClass} item with ID ${itemElement._id} found`
    );
  }

  return dataItem;
}

function findMatchingDataScopeOrThrow(
  className: string,
  dataStack: DataStack | undefined
): DataScope {
  const itemElement = findMatchingScopeElementOrThrow(className, dataStack);
  if (isDataScopePojo(itemElement)) return dataScopeFromPojo(itemElement);

  throw new ArgumentError(`No ${className} scope found`);
}

function findMatchingItemElementOrThrow(
  dataClass: string,
  dataStack: DataStack | undefined
) {
  if (!dataStack) {
    throw new ArgumentError(`No ${dataClass} found`);
  }

  const itemElement = findItemInDataStackAndGlobalData(dataClass, dataStack);

  if (!itemElement) {
    throw new ArgumentError(`No ${dataClass} item found`);
  }

  return itemElement;
}

function findMatchingScopeElementOrThrow(
  dataClass: string,
  dataStack: DataStack | undefined
) {
  if (!dataStack) {
    throw new ArgumentError(`No ${dataClass} found`);
  }

  const itemElement = findScopeInDataStackAndGlobalData(dataClass, dataStack);

  if (!itemElement) {
    throw new ArgumentError(`No ${dataClass} scope found`);
  }

  return itemElement;
}
