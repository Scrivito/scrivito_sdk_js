import {
  DataScope,
  getDataClass,
  isScopeElement,
} from 'scrivito_sdk/data_integration';
import { useLastDataStackElement } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataScope(): DataScope | undefined {
  const element = useLastDataStackElement();
  if (!element || !isScopeElement(element)) return;

  const { _class: dataClassName, filters } = element;
  let dataScope = getDataClass(dataClassName).all();

  Object.keys(filters).forEach((attributeName) => {
    dataScope = dataScope.filter(attributeName, filters[attributeName]);
  });

  return dataScope;
}
