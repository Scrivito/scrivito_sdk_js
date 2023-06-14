import * as React from 'react';

import {
  DataContext,
  DataContextCallback,
  DataItem,
  DataScope,
  DataStack,
  DataStackElement,
  ExternalDataScope,
  ObjDataScope,
  getNextDataStack,
  toDataContext,
} from 'scrivito_sdk/data_integration';
import { Obj, unwrapAppClass } from 'scrivito_sdk/realm';

export interface DataContextContainer {
  dataContext: DataContext | DataContextCallback;
  dataStack: DataStack;
}

const ReactContext = React.createContext<DataContextContainer | undefined>(
  undefined
);

export function useDataContextContainer(): DataContextContainer | undefined {
  return React.useContext(ReactContext);
}

export function useDataContext():
  | DataContext
  | DataContextCallback
  | undefined {
  return React.useContext(ReactContext)?.dataContext;
}

export function useDataStack(): DataStack | undefined {
  return React.useContext(ReactContext)?.dataStack;
}

export function useLastDataStackElement(): DataStackElement | undefined {
  const dataStack = React.useContext(ReactContext)?.dataStack;
  return dataStack && dataStack[0];
}

export function DataContextProvider({
  dataContext: maybeDataContext,
  children,
}: {
  dataContext:
    | DataContext
    | DataContextCallback
    | DataItem
    | DataScope
    | Obj
    | null
    | undefined;
  children: React.ReactElement;
}) {
  const prevDataStack = React.useContext(ReactContext)?.dataStack || [];

  if (!maybeDataContext) return children;

  if (maybeDataContext instanceof DataScope) {
    if (
      maybeDataContext instanceof ObjDataScope ||
      maybeDataContext instanceof ExternalDataScope
    ) {
      return (
        <ReactContext.Provider
          value={{
            dataContext: {},
            dataStack: [maybeDataContext.toPojo(), ...prevDataStack],
          }}
          children={children}
        />
      );
    }

    return children;
  }

  const dataContext = toDataContext(unwrapAppClass(maybeDataContext));
  if (!dataContext) return children;

  const dataStack = getNextDataStack(prevDataStack, dataContext);

  return (
    <ReactContext.Provider
      value={{ dataContext, dataStack }}
      children={children}
    />
  );
}
