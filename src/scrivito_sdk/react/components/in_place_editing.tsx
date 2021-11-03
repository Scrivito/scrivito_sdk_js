import * as React from 'react';
import { isInPlaceEditingActive } from 'scrivito_sdk/app_support/editing_context';
import { InPlaceEditingEnabledContextProvider } from 'scrivito_sdk/react/in_place_editing_enabled_context';

/** @public */
export const InPlaceEditingOff: React.SFC = ({ children }) =>
  isInPlaceEditingActive() ? (
    <InPlaceEditingEnabledContextProvider children={children} value={false} />
  ) : (
    (children as ReactChildren)
  );

/** @public */
export const RestoreInPlaceEditing: React.SFC = ({ children }) =>
  isInPlaceEditingActive() ? (
    <InPlaceEditingEnabledContextProvider children={children} value={true} />
  ) : (
    (children as ReactChildren)
  );

// can be deleted after https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18051 is fixed
type ReactChildren = React.ReactElement<unknown> | null;
