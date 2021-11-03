import { Iterator, IteratorResult } from 'scrivito_sdk/common';

export interface Iterable<T> {
  iterator(): Iterator<T>;
}

export interface ContinueIterable<T, C> extends Iterable<T> {
  iterator(): ContinueIterator<T, C>;
  iteratorFromContinuation(continuation: C): ContinueIterator<T, C>;
}

export interface ContinueIterator<T, C> extends Iterator<T> {
  next(): IteratorResult<T>;
  continuation(): C | undefined;
}
