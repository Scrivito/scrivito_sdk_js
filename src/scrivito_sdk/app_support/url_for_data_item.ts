import { currentSiteId } from 'scrivito_sdk/app_support/current_page';
import { getDetailsPageUrl } from 'scrivito_sdk/app_support/get_details_page_url';
import { assertNotUsingInMemoryTenant } from 'scrivito_sdk/data';
import { DataItem } from 'scrivito_sdk/data_integration/data_class';

/** @public */
export function urlForDataItem(dataItem: DataItem): string | null {
  assertNotUsingInMemoryTenant('Scrivito.urlForDataItem');

  const obj = dataItem.obj();
  const siteId = currentSiteId();

  if (obj) {
    return getDetailsPageUrl(dataItem, obj.siteId() || siteId);
  }

  return siteId ? getDetailsPageUrl(dataItem, siteId) : null;
}
