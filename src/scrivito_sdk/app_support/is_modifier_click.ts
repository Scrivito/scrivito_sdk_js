import { MouseEvent } from 'react';

// IE11 is the only browser triggering a click event on middle click, so we must take care of it.
// Chrome, FF, Edge handle the middle click without triggering an event.
const IE11_MIDDLE_MOUSE_BUTTON = 2;

interface MouseEventWithWhich extends MouseEvent {
  which: number | undefined;
}

export function isModifierClick(event: MouseEvent) {
  return (
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    (event as MouseEventWithWhich).which === IE11_MIDDLE_MOUSE_BUTTON
  );
}
