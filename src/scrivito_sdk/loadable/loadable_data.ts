import { ContextContainer } from 'scrivito_sdk/common';
import {
  LoaderProcessOptions,
  createLoaderProcess,
} from 'scrivito_sdk/loadable/create_loader_process';
import * as LoadHandler from 'scrivito_sdk/loadable/load_handler';
import {
  LoadableMeta,
  LoadableState,
  StateAvailable,
  throwIfErrorMeta,
} from 'scrivito_sdk/loadable/loadable_state';
import {
  InvalidationCallback,
  metaHasBeenInvalidated,
  versionFromCallback,
} from 'scrivito_sdk/loadable/loader_callback_process';
import {
  LoaderProcess,
  notifyDataWasSet,
  subscribeLoading,
  subscriberCountForLoading,
} from 'scrivito_sdk/loadable/loading_registry';
import { NotLoadedError } from 'scrivito_sdk/loadable/not_loaded_error';
import { StateContainer, StateReader } from 'scrivito_sdk/state';

type LoadableDataOptions<T> = LoaderProcessOptions<T> & {
  state: StateContainer<LoadableState<T>>;
  affiliation?: Affiliation;
};

export interface Affiliation {
  collectionName: string;
  key: unknown;
}

// Additionally, it may either be loading or not loading.

// Usually, the value goes through the following transitions:
// (missing, not loading)  -> (missing, loading) -> (available, not loading)
// However when something goes wrong, this transition might occur:
// (missing, not loading)  -> (missing, loading) -> (error, not loading)
//
// Other transitions are also valid,
// i.e. all possible transitions may eventually occur.

export class LoadableData<LoadableType> {
  private affiliation?: Affiliation;
  private stateContainer: StateContainer<LoadableState<LoadableType>>;
  private id: string;
  private invalidation?: InvalidationCallback;
  private processFactory: () => LoaderProcess;

  // state is the stateContainer where the LoadableData should store its state.
  constructor(options: LoadableDataOptions<LoadableType>) {
    this.stateContainer = options.state;
    this.id = options.state.id();
    this.affiliation = options.affiliation;
    this.invalidation = options.invalidation;
    this.processFactory = () =>
      createLoaderProcess(options, this.stateContainer);
  }

  ensureAvailable(): boolean {
    notifyUsage(this.id, this);

    return this.checkIfAvailableMeta(this.getMeta());
  }

  /** Access the LoadableData synchronously, assuming it is available.
   * If the LoadableData is an error, the error is thrown.
   * If the LoadableData is missing or loading, undefined will be returned.
   */
  get(): LoadableType | undefined {
    const state = this.stateContainer.get();
    if (!this.checkIfAvailableState(state)) return undefined;

    notifyUsage(this.id, this);
    return state.value;
  }

  getAffiliation(): Affiliation | undefined {
    return this.affiliation;
  }

  getWithDefault<T>(theDefault: T): LoadableType | T {
    const state = this.stateContainer.get();
    if (!this.checkIfAvailableState(state)) return theDefault;

    notifyUsage(this.id, this);
    return state.value;
  }

  /** Similar to LoadableData#get, but if the data is not available,
   * throws a NotLoadedError (instead of returning undefined).
   */
  getOrThrow(): LoadableType {
    const state = this.stateContainer.get();
    if (!this.checkIfAvailableState(state)) throw new NotLoadedError();

    notifyUsage(this.id, this);
    return state.value;
  }

  reader(): StateReader<LoadableType> {
    this.ensureAvailable();

    return this.stateContainer.reader().subState('value');
  }

  // set the data to a value. this makes the value available.
  set(value: LoadableType): void {
    this.stateContainer.set({
      value,
      meta: { version: this.currentVersion() },
    });
    notifyDataWasSet(this.id);
  }

  // set the data to an error.
  setError(error: Error): void {
    this.stateContainer.set({
      meta: { error, version: this.currentVersion() },
    });
    notifyDataWasSet(this.id);
  }

  // transition back to missing, removes any value or errors.
  reset(): void {
    this.stateContainer.set(undefined);
  }

  // returns true iff the value is missing
  isMissing(): boolean {
    return this.getMeta() === undefined;
  }

  // return true iff value is available.
  isAvailable(): boolean {
    const meta = this.getMeta();
    return meta !== undefined && meta.error === undefined;
  }

  // return true iff an error was set.
  isError(): boolean {
    return this.getMeta()?.error !== undefined;
  }

  // for test purposes only
  numSubscribers(): number {
    return subscriberCountForLoading(this.id);
  }

  // package-private: don't call from outside of 'scrivito_sdk/loadable'
  subscribeLoading(): () => void {
    return subscribeLoading(this.id, this.processFactory);
  }

  private getMeta() {
    return this.stateContainer.subState('meta').get();
  }

  private checkIfAvailableState(
    state: LoadableState<LoadableType> | undefined
  ): state is StateAvailable<LoadableType> {
    return this.checkIfAvailableMeta(state?.meta);
  }

  private checkIfAvailableMeta(meta: LoadableMeta | undefined) {
    if (meta === undefined) {
      if (!LoadHandler.isCurrentlyCapturing()) {
        // this is only intended for developers working on the console
        // therefore not unsubscribing is okay here
        this.subscribeLoading();

        LoadHandler.throwNoLoadingContext();
      }

      LoadHandler.notifyDataRequired('incomplete', this);

      return false;
    }

    LoadHandler.notifyDataRequired(
      loadingStateFromMeta(meta, this.invalidation),
      this
    );

    throwIfErrorMeta(meta);

    return true;
  }

  private currentVersion() {
    return versionFromCallback(this.invalidation);
  }
}

function loadingStateFromMeta(
  meta: LoadableMeta,
  invalidation?: InvalidationCallback
) {
  if (metaHasBeenInvalidated(meta, invalidation)) return 'outdated';

  return meta.incomplete ? 'incomplete' : 'available';
}

interface UsageStore {
  [id: string]: LoadableData<unknown>;
}

const usageContext = new ContextContainer<UsageStore>();

function notifyUsage(id: string, data: LoadableData<unknown>): void {
  const store = usageContext.current();
  if (store) {
    store[id] = data;
  }
}

interface UsedDataReport<T> {
  result: T;
  usedData: Array<LoadableData<unknown>>;
}

/** runs fn(), and reports all LoadableData that is used */
export function reportUsedData<T>(fn: () => T): UsedDataReport<T> {
  const store = {};

  const result = usageContext.runWith(store, fn);

  return {
    result,
    usedData: values(store),
  };
}

// Object.values replacement (IE11 doesn't have it)
function values<V>(objekt: { [index: string]: V }): V[] {
  return Object.keys(objekt).map((key) => objekt[key]);
}
