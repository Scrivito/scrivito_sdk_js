import * as React from 'react';

import { getEditableArea } from 'scrivito_sdk/app_support/editable_area';
import { useCurrentEditableArea } from 'scrivito_sdk/react/components/current_editable_area';
import { InPlaceEditingEnabledContext } from 'scrivito_sdk/react/in_place_editing_enabled_context';

export function useInPlaceEditing(): boolean {
  const currentEditableArea = useCurrentEditableArea();

  const inPlaceEditingEnabled = React.useContext(InPlaceEditingEnabledContext);
  if (!inPlaceEditingEnabled) return false;

  switch (getEditableArea()) {
    case 'layout':
      return (
        currentEditableArea === 'outermostLayout' ||
        currentEditableArea === 'currentPageLayout'
      );
    case 'page':
      return currentEditableArea === 'currentPage';
    default:
      return true;
  }
}
