// @rewire

import { onTestResetBeforeEach } from './reset_callbacks';

let consoleErrorIsDisabled = false;

export function logError(...args: unknown[]): void {
  if (!consoleErrorIsDisabled) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

onTestResetBeforeEach(() => (consoleErrorIsDisabled = true));
