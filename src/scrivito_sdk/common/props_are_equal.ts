import * as React from 'react';

import { equalsBestEffort } from 'scrivito_sdk/common';

export function propsAreEqual<P extends object>(
  prevProps: Readonly<React.PropsWithChildren<P>>,
  nextProps: Readonly<React.PropsWithChildren<P>>
): boolean;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function propsAreEqual<T extends React.ComponentType<any>>(
  prevProps: Readonly<React.ComponentProps<T>>,
  nextProps: Readonly<React.ComponentProps<T>>
): boolean {
  return Object.keys(prevProps).every((key) =>
    equalsBestEffort(prevProps[key], nextProps[key])
  );
}
