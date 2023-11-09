import { CustomAttributeJsonMapping } from 'scrivito_sdk/client';
import { createStateContainer } from 'scrivito_sdk/state';

const autoConvertAttributes = createStateContainer<boolean>();

export function setWantsAutoAttributeConversion(value: boolean): void {
  autoConvertAttributes.set(value);
}

export function wantsAutoAttributeConversion(): boolean {
  return !!autoConvertAttributes.get();
}

const SINGLE_TYPE_FOR = {
  linklist: 'link',
  referencelist: 'reference',
  stringlist: 'string',
};

type ValidListType = keyof typeof SINGLE_TYPE_FOR;

export function autoConvertToSingle(value: unknown): unknown {
  const type = wantsAutoAttributeConversion() && backendValueType(value);

  if (type === 'html') {
    return ['string', (value as CustomAttributeJsonMapping['html'])[1]];
  }

  const targetType = type && SINGLE_TYPE_FOR[type as ValidListType];
  if (!targetType) return value;

  /** Valid cast: a present `targetType` implies a `ValidListType` */
  const listValue = (value as CustomAttributeJsonMapping[ValidListType])[1];
  return listValue.length ? [targetType, listValue[0]] : value;
}

const LIST_TYPE_FOR = {
  html: 'stringlist',
  link: 'linklist',
  reference: 'referencelist',
  string: 'stringlist',
};

type ValidSingleType = keyof typeof LIST_TYPE_FOR;

export function autoConvertToList(value: unknown): unknown {
  const type = wantsAutoAttributeConversion() && backendValueType(value);
  const targetType = type && LIST_TYPE_FOR[type as ValidSingleType];
  if (!targetType) return value;

  const singleValue = (value as CustomAttributeJsonMapping[ValidSingleType])[1];
  return singleValue ? [targetType, [singleValue]] : value;
}

type BackendType = keyof CustomAttributeJsonMapping;

function backendValueType(value: unknown): BackendType | undefined {
  return Array.isArray(value) ? (value[0] as BackendType) : undefined;
}
