import { onTestResetAfterEach } from 'scrivito_sdk/common';

let strictSearchOperators = false;

export function enableStrictSearchOperators(): void {
  strictSearchOperators = true;
}

export function areStrictSearchOperatorsEnabled(): boolean {
  return strictSearchOperators;
}

onTestResetAfterEach(() => (strictSearchOperators = false));
