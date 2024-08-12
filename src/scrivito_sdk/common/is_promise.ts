export function isPromise<T>(value: unknown): value is Promise<T> {
  return !!(
    value &&
    typeof value === 'object' &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
