import { escape } from 'underscore';

import {
  DataContext,
  DataContextCallback,
  DataContextIdentifier,
  DataContextValue,
  getValueFromDataContext,
  isValidDataContextIdentifier,
  isValidDataContextValue,
} from 'scrivito_sdk/app_support/data_context';
import { ArgumentError, throwNextTick } from 'scrivito_sdk/common';

const PLACEHOLDERS = /__([a-z](_?[a-z0-9]+)*)__/gi;
const SINGLE_PLACEHOLDER = /^__([a-z](_?[a-z0-9]+)*)__$/i;

export function containsSinglePlaceholder(text: string): boolean {
  return !!text.match(SINGLE_PLACEHOLDER);
}

export function replaceStringPlaceholdersWithData(
  text: string,
  context: DataContext | DataContextCallback
): string {
  return text.replace(PLACEHOLDERS, (placeholder, identifier) => {
    const value = getContextValue(identifier, context);
    return value === undefined ? placeholder : value;
  });
}

export function replaceHtmlPlaceholdersWithData(
  html: string,
  context: DataContext | DataContextCallback
): string {
  return html.replace(PLACEHOLDERS, (placeholder, identifier) => {
    const value = getContextValue(identifier, context);
    return value === undefined ? placeholder : escape(value);
  });
}

function getContextValue(
  identifier: DataContextIdentifier,
  context: DataContext | DataContextCallback
): DataContextValue | undefined {
  if (!isValidDataContextIdentifier(identifier)) return undefined;

  const value = getValueFromDataContext(identifier, context);
  if (isValidDataContextValue(value)) return value;

  throwNextTick(
    new ArgumentError(
      `Expected a data context value to be a string or undefined, but got ${value}`
    )
  );
}
