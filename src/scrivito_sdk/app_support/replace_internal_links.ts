import { basicUrlForObj } from 'scrivito_sdk/app_support/basic_url_for';
import { currentAppSpace } from 'scrivito_sdk/app_support/current_app_space';
import { generateUrl } from 'scrivito_sdk/app_support/routing';
import { checkArgumentsFor, tcomb as t } from 'scrivito_sdk/common';
import { formatInternalLinks } from 'scrivito_sdk/link_resolution';
import { getObjFrom } from 'scrivito_sdk/models';

/** @public */
export function resolveHtmlUrls(htmlString: string): string {
  checkResolveHtmlUrls(htmlString);

  return replaceInternalLinks(htmlString);
}

export function replaceInternalLinks(
  htmlString: string,
  options?: { preserveObjId?: true }
): string {
  return formatInternalLinks(htmlString, (internalLinkUrl) => {
    const { obj_id: objId, ...queryAndHash } = internalLinkUrl;
    const obj = getObjFrom(currentAppSpace(), objId);

    if (!obj) return generateUrl({ objId, ...queryAndHash });

    return basicUrlForObj(obj, {
      ...queryAndHash,
      ...options,
      withoutOriginIfLocal: true,
    });
  });
}

const checkResolveHtmlUrls = checkArgumentsFor(
  'resolveHtmlUrls',
  [['htmlString', t.String]],
  { docPermalink: 'js-sdk/resolveHtmlUrls' }
);
