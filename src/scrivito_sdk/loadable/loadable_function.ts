import { LoadableData, LoadableState } from 'scrivito_sdk/loadable';
import { dejitterStateStream } from 'scrivito_sdk/loadable/dejitter_state_stream';
import { observeAndLoad } from 'scrivito_sdk/loadable/observe_and_load';
import { createStateContainer } from 'scrivito_sdk/state';

interface FunctionState<T> {
  [serializedArgs: string]: LoadableState<T>;
}

/** Wrap the given function so that it uses a "loadable" cache.
 *
 * This has several effects:
 * * The function is computed asynchronously ("in the background").
 * * The function is cached, i.e. several consumers can use the function with
 *   the same input, but only one computation takes place for each unique input.
 * * Once completely loaded, the function does not "jitter",
 *   i.e. no temporary incomplete results are shown.
 *
 * While the function is loading, the 'defaultValue' is returned.
 * An 'argsToString' function must be provided, which maps each unique input to a unique string.
 */
export function loadableFunction<Args extends unknown[], Return>(
  defaultValue: Return,
  argsToString: (...args: Args) => string,
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const functionState = createStateContainer<FunctionState<Return>>();

  return (...args: Args) => {
    const data = new LoadableData({
      state: functionState.subState(argsToString(...args)),
      loadableStream: dejitterStateStream(observeAndLoad(() => fn(...args))),
    });

    return data.getWithDefault(defaultValue);
  };
}
