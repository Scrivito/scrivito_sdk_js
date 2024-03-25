import doThrottle, { ThrottleSettings } from 'lodash-es/throttle';
import { onTestResetBeforeEach } from './reset_callbacks';

let shouldBypassThrottle: boolean = false;

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
  options?: ThrottleSettings
): T {
  return shouldBypassThrottle
    ? fn
    : (doThrottle(fn, ms, options) as unknown as T);
}

onTestResetBeforeEach(() => (shouldBypassThrottle = true));
