import * as React from 'react';
import * as URI from 'urijs';

import { getCurrentPageData } from 'scrivito_sdk/app_support/current_page_data';
import { getDataContext } from 'scrivito_sdk/app_support/data_context';
import { NavigationState } from 'scrivito_sdk/app_support/navigation_state';
import { QueryParameters } from 'scrivito_sdk/common';
import { BasicObj } from 'scrivito_sdk/models';
import { getDataErrorComponent } from 'scrivito_sdk/react/component_registry';
import { useLayout } from 'scrivito_sdk/react/components/current_page/use_layout';
import { PageScroll } from 'scrivito_sdk/react/components/page_scroll';
import { connect } from 'scrivito_sdk/react/connect';
import { DataContextProvider } from 'scrivito_sdk/react/data_context_container';
import { getComponentForPageClass } from 'scrivito_sdk/react/get_component_for_page_class';
import { wrapInAppClass } from 'scrivito_sdk/realm';

/** @public */
export const CurrentPage: React.ComponentType<unknown> = connect(
  function CurrentPage() {
    const pageData = getCurrentPageData();
    if (!pageData) return null;

    const { currentPage, navigationState } = pageData;
    if (!currentPage) return null;

    return (
      <CurrentPageWithLayout
        currentPage={currentPage}
        navigationState={navigationState}
      />
    );
  }
);

const CurrentPageWithLayout = connect(function CurrentPageWithLayout({
  currentPage,
  navigationState,
}: {
  currentPage: BasicObj;
  navigationState: NavigationState;
}) {
  const layout = useLayout(currentPage);

  const params = URI.parseQuery(navigationState?.locationRoute?.query ?? '');

  if (layout) {
    return layout === 'loading'
      ? null
      : withCurrentPageDataContext(currentPage, params, layout);
  }

  const PageComponent = getComponentForPageClass(currentPage.objClass());

  return withCurrentPageDataContext(
    currentPage,
    params,
    <>
      <PageScroll navigationState={navigationState} />
      <PageComponent page={wrapInAppClass(currentPage)} params={params} />
    </>
  );
});

function withCurrentPageDataContext(
  currentPage: BasicObj,
  params: QueryParameters,
  children: React.ReactElement
) {
  const dataContext = getDataContext(currentPage, params);

  if (dataContext === 'loading') return null;
  if (dataContext === 'unavailable') return renderDataError();

  return (
    <DataContextProvider dataContext={dataContext}>
      {children}
    </DataContextProvider>
  );
}

function renderDataError() {
  const DataErrorComponent = getDataErrorComponent();
  return DataErrorComponent ? <DataErrorComponent /> : <>Data Not Found</>;
}

CurrentPage.displayName = 'Scrivito.CurrentPage';
