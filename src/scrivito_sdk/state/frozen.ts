import { ContextContainer, ScrivitoError } from 'scrivito_sdk/common';

export interface FrozenContext {
  contextName: string;
  message?: string;
}

const frozenContextContainer = new ContextContainer<FrozenContext>();

export function withFrozenState<T>(
  frozenContext: FrozenContext,
  fn: () => T
): T {
  return frozenContextContainer.runWith(frozenContext, fn);
}

export function failIfFrozen(operationName: string) {
  const frozenContext = frozenContextContainer.current();

  if (frozenContext) {
    const message =
      `${operationName} is not permitted ` +
      `inside '${frozenContext.contextName}'. ` +
      (frozenContext.message || '');

    throw new StateChangePreventedError(message);
  }
}

export class StateChangePreventedError extends ScrivitoError {}
