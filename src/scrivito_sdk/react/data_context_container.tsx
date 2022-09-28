import * as React from 'react';

import {
  DataContext,
  DataContextCallback,
  getValueFromDataContext,
} from 'scrivito_sdk/app_support/data_context';
import { DataStack, DataStackItem } from 'scrivito_sdk/app_support/data_stack';

export interface DataContextContainer {
  placeholders: DataContext | DataContextCallback;
  dataStack: DataStack;
}

const ReactContext = React.createContext<DataContextContainer | undefined>(
  undefined
);

export function useDataContextContainer(): DataContextContainer | undefined {
  return React.useContext(ReactContext);
}

export function usePlaceholders():
  | DataContext
  | DataContextCallback
  | undefined {
  return React.useContext(ReactContext)?.placeholders;
}

export function useDataStack(): DataStack | undefined {
  return React.useContext(ReactContext)?.dataStack;
}

export function useDataStackItem(): DataStackItem | undefined {
  const dataStack = React.useContext(ReactContext)?.dataStack;
  return dataStack && dataStack[0];
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

  let dataStack: DataStack;

  if (dataClassName) {
    dataStack = dataId
      ? [{ _class: dataClassName, _id: dataId }, ...prevDataStack]
      : [{ _class: dataClassName }, ...prevDataStack];
  } else {
    dataStack = prevDataStack;
  }

  return (
    <ReactContext.Provider
      value={{ placeholders: dataContext, dataStack }}
      children={children}
    />
  );
}
