// @rewire
import { Streamable } from 'scrivito_sdk/common';
import { LoadableData, LoadableState } from 'scrivito_sdk/loadable';
import { createStateContainer } from 'scrivito_sdk/state';
import { ElementBoundaries } from 'scrivito_sdk/ui_interface';

interface ElementBoundariesState {
  [elementId: string]: LoadableState<ElementBoundaries | null> | undefined;
}

const stateContainer = createStateContainer<ElementBoundariesState>();

const registry: ElementRegistry = {};

export function registerElement(elementId: number, element: Element): void {
  registry[elementId] = element;
}

export function unregisterElement(elementId: number): void {
  delete registry[elementId];
}

interface ElementRegistry {
  [elementId: number]: Element | null | undefined;
}

/**
 * Streams `ElementBoundaries` every 1000 ms.
 * Streams `undefined` if the boundaries are not loaded.
 * Streams `null` if element is unknown or has been removed.
 */
export function getElementBoundaries(
  elementId: number
): ElementBoundaries | null | undefined {
  if (!registry[elementId]) {
    return null;
  }

  return getData(elementId).get();
}

// For test purpose only.
export function getRegisteredElementId(
  element: HTMLElement
): number | undefined {
  for (const key of Object.keys(registry)) {
    const elementId = parseInt(key, 10);

    if (registry[elementId] === element) {
      return elementId;
    }
  }
}

// For test purpose only.
export function calculateElementBoundaries(
  element: Element
): ElementBoundaries {
  const { left, top, width, height } = element.getBoundingClientRect();

  return {
    x: left + window.pageXOffset,
    y: top + window.pageYOffset,
    width,
    height,
  };
}

function getData(elementId: number) {
  return new LoadableData({
    state: getState(elementId),
    stream: new Streamable<ElementBoundaries | null>((subscriber) => {
      const updateElementBoundaries = () => {
        const element = registry[elementId];
        subscriber.next(element ? calculateElementBoundaries(element) : null);
      };

      updateElementBoundaries();
      const intervalId = window.setInterval(updateElementBoundaries, 1000);

      return () => window.clearInterval(intervalId);
    }),
  });
}

function getState(elementId: number) {
  return stateContainer.subState(elementId.toString());
}
