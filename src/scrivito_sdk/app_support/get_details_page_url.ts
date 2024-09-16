import { basicUrlForObj } from 'scrivito_sdk/app_support/basic_url_for';
import { parameterizeDataClass } from 'scrivito_sdk/common';
import { DataItem } from 'scrivito_sdk/data_integration/data_class';
import { getDetailsPageForDataParam } from 'scrivito_sdk/models';

export function getDetailsPageUrl(
  dataItem: DataItem,
  siteId: string | null
): string | null {
  const dataClassName = dataItem.dataClassName();
  const detailsPage = getDetailsPageForDataParam(dataClassName, siteId);

  if (!detailsPage) return null;

  const query = `${parameterizeDataClass(dataClassName)}=${dataItem.id()}`;
  return basicUrlForObj(detailsPage, { query });
}
