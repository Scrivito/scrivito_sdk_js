import * as URI from 'urijs';

export function ensureUrlHasProtocol(url: string): string {
  let uri: URI;

  try {
    uri = URI(url);
  } catch {
    return url;
  }

  if (!uri.protocol() && url.match(/^[^/@]+@[^/@]+$/)) {
    return `mailto:${url}`;
  }

  if (!(uri.protocol() || url.startsWith('/')) && url.includes('.')) {
    return `https://${url}`;
  }

  return url;
}
