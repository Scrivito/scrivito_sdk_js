import {
  DataContext,
  DataContextCallback,
  getDataContextValue,
} from 'scrivito_sdk/data_integration';

const PLACEHOLDERS = /__([a-z](_?[a-z0-9]+)*)__/gi;
const SINGLE_PLACEHOLDER = /^__([a-z](_?[a-z0-9]+)*)__$/i;

export function containsSinglePlaceholder(text: string): boolean {
  return !!text.match(SINGLE_PLACEHOLDER);
}

export function replacePlaceholdersWithData(
  text: string,
  context: DataContext | DataContextCallback,
  transform?: (rawValue: string) => string
): string {
  return text.replace(PLACEHOLDERS, (placeholder, identifier) => {
    const rawValue = getDataContextValue(identifier, context);

    if (rawValue === undefined) return placeholder;

    return transform ? transform(rawValue) : rawValue;
  });
}
