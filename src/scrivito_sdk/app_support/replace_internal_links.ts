import { basicUrlForObj } from 'scrivito_sdk/app_support/basic_url_for';
import { currentAppSpace } from 'scrivito_sdk/app_support/current_app_space';
import { getDataContextQuery } from 'scrivito_sdk/app_support/data_context';
import { generateUrl } from 'scrivito_sdk/app_support/routing';
import { checkArgumentsFor, tcomb as t } from 'scrivito_sdk/common';
import { InternalUrl, formatInternalLinks } from 'scrivito_sdk/link_resolution';
import { getObjFrom } from 'scrivito_sdk/models';
import { DataContextContainer } from 'scrivito_sdk/react/data_context_container';

/** @public */
export function resolveHtmlUrls(htmlString: string): string {
  checkResolveHtmlUrls(htmlString);

  return replaceInternalLinks(htmlString);
}

interface Options {
  preserveObjId?: true;
  dataContextContainer?: DataContextContainer;
}

export function replaceInternalLinks(
  htmlString: string,
  options?: Options
): string {
  return formatInternalLinks(htmlString, (url) =>
    calculateInternalLinkUrl(url, options)
  );
}

function calculateInternalLinkUrl(
  { obj_id: objId, query, hash }: InternalUrl,
  options?: Options
) {
  const obj = getObjFrom(currentAppSpace(), objId);
  if (!obj) return generateUrl({ objId, query, hash });

  const dataContextContainer = options?.dataContextContainer;

  return basicUrlForObj(obj, {
    query: dataContextContainer
      ? getDataContextQuery(obj, dataContextContainer, query)
      : query,
    hash,
    ...options,
    withoutOriginIfLocal: true,
  });
}

const checkResolveHtmlUrls = checkArgumentsFor(
  'resolveHtmlUrls',
  [['htmlString', t.String]],
  { docPermalink: 'js-sdk/resolveHtmlUrls' }
);
