import {
  DataItem,
  isItemElement,
  itemElementToDataItem,
} from 'scrivito_sdk/data_integration';
import { useLastDataStackElement } from 'scrivito_sdk/react/data_context_container';

/** @beta */
export function useDataItem(): DataItem | undefined {
  const element = useLastDataStackElement();

  if (element && isItemElement(element)) {
    return itemElementToDataItem(element);
  }
}
