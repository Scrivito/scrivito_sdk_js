import * as URI from 'urijs';

export interface InternalUrl {
  obj_id: string;
  query?: string;
  hash?: string;
}

export const OBJ_ID_PATTERN = /\bobjid:[a-f0-9]{16}\b/g;

const INTERNAL_LINK_URL_PATTERN = new RegExp(
  `${OBJ_ID_PATTERN.source}[^"']*`,
  'g'
);

export function formatInternalLinks(
  htmlString: string,
  format: (url: InternalUrl) => string | null
): string {
  return htmlString.replace(
    INTERNAL_LINK_URL_PATTERN,
    (internalLinkUrl) =>
      format(parseInternalUrl(internalLinkUrl)) ?? internalLinkUrl
  );
}

function parseInternalUrl(internalLinkUrl: string): InternalUrl {
  const uri = new URI(internalLinkUrl);

  return {
    obj_id: internalLinkUrl.slice(6, 22),
    query: uri.query(),
    hash: uri.fragment(),
  };
}
