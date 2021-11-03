import * as React from 'react';
import * as URI from 'urijs';

import { getCurrentPageData } from 'scrivito_sdk/app_support/current_page_data';
import { PageScroll } from 'scrivito_sdk/react/components/page_scroll';
import { connect } from 'scrivito_sdk/react/connect';
import { getComponentForPageClass } from 'scrivito_sdk/react/get_component_for_page_class';
import { wrapInAppClass } from 'scrivito_sdk/realm';

/** @public */
export const CurrentPage: React.ComponentType<unknown> = connect(
  function CurrentPage() {
    const pageData = getCurrentPageData();
    if (!pageData) return null;

    const { currentPage, navigationState } = pageData;
    if (!currentPage) return null;

    const pageElement = React.createElement(
      getComponentForPageClass(currentPage.objClass()),
      {
        page: wrapInAppClass(currentPage),
        params: URI.parseQuery(navigationState?.locationRoute?.query ?? ''),
      }
    );

    return (
      <>
        <PageScroll navigationState={navigationState} />
        {pageElement}
      </>
    );
  }
);

CurrentPage.displayName = 'Scrivito.CurrentPage';
