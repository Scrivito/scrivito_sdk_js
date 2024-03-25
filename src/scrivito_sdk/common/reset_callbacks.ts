const isProductionBuild = process.env.NODE_ENV !== 'development';

const resetCallbacksBeforeAll: Array<() => void> = [];
const resetCallbacksBeforeEach: Array<() => void> = [];
const resetCallbacksAfterEach: Array<() => void> = [];

/** for test purposes */
export function onTestResetBeforeAll(callback: () => void): void {
  // enable code removal in production build
  if (isProductionBuild) return;

  resetCallbacksBeforeAll.push(callback);
}

/** for test purposes */
export function onTestResetBeforeEach(callback: () => void): void {
  // enable code removal in production build
  if (isProductionBuild) return;

  resetCallbacksBeforeEach.push(callback);
}

/** for test purposes */
export function onTestResetAfterEach(callback: () => void): void {
  // enable code removal in production build
  if (isProductionBuild) return;

  resetCallbacksAfterEach.push(callback);
}

/** for test purposes */
export function runResetCallbacksBeforeAll(): void {
  resetCallbacksBeforeAll.forEach((callback) => callback());
}

/** for test purposes */
export function runResetCallbacksBeforeEach(): void {
  resetCallbacksBeforeEach.forEach((callback) => callback());
}

/** for test purposes */
export function runResetCallbacksAfterEach(): void {
  resetCallbacksAfterEach.forEach((callback) => callback());
}
