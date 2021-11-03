import * as URI from 'urijs';

import { currentHref, replaceHistoryState } from 'scrivito_sdk/common';

const IDENTIFIER = '&scrivito.authFailedCount=';
let failureCount: number;

export function init(): void {
  reset();
  const uri = new URI(currentHref());
  const fragment = uri.hash();
  const offset = fragment.indexOf(IDENTIFIER);
  if (offset < 0) return;

  const countAsString = fragment.substr(offset + IDENTIFIER.length, 3);
  let remainingFragment = fragment.substring(0, offset);
  if (remainingFragment === '#') {
    remainingFragment = '';
  }
  const newLocation = uri.fragment(remainingFragment).toString();
  failureCount = parseInt(countAsString, 10) || 0;
  replaceHistoryState({}, '', newLocation);
}

export function reset(): void {
  failureCount = 0;
}

export function augmentedRedirectUrl(): string {
  const uri = new URI(currentHref());
  const augmentedHash = `${uri.hash()}${IDENTIFIER}${failureCount + 1}`;

  return uri.hash(augmentedHash).toString();
}

export function currentFailureCount(): number {
  return failureCount;
}
