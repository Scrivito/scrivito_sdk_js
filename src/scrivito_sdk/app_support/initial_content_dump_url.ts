import { ArgumentError } from 'scrivito_sdk/common';
import { createStateContainer } from 'scrivito_sdk/state';

const initialContentDumpUrl = createStateContainer<string>();

export function setInitialContentDumpUrl(url: string): void {
  if (URL.canParse(url)) {
    initialContentDumpUrl.set(url);
  } else {
    throw new ArgumentError(
      "The 'initialContentDumpUrl' must be an absolute url"
    );
  }
}

export function getInitialContentDumpUrl(): string | undefined {
  return initialContentDumpUrl.get();
}
