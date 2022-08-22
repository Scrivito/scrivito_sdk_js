import * as React from 'react';

import {
  DataContext,
  DataContextCallback,
  getValueFromDataContext,
} from 'scrivito_sdk/app_support/data_context';

export interface DataContextContainer {
  dataContext: DataContext | DataContextCallback;
  dataStack: DataStack;
}

export type DataStack = Array<{ _id: string; _class: string }>;

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

export function DataContextProvider({
  dataContext,
  children,
}: {
  dataContext: DataContext | DataContextCallback | undefined;
  children: React.ReactElement;
}) {
  const prevDataStack = React.useContext(ReactContext)?.dataStack || [];

  if (!dataContext) return children;

  const dataClassName = getValueFromDataContext('_class', dataContext);
  const dataId = getValueFromDataContext('_id', dataContext);

  const dataStack =
    dataClassName && dataId
      ? [{ _class: dataClassName, _id: dataId }, ...prevDataStack]
      : prevDataStack;

  return (
    <ReactContext.Provider
      value={{ dataContext, dataStack }}
      children={children}
    />
  );
}
