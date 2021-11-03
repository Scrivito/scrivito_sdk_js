export function computeParentPath(path?: string | null): string | null {
  return !path || path === '/' ? null : path.replace(LAST_PATH_COMPONENT, '');
}

const LAST_PATH_COMPONENT = /\b\/?[^/]*$/;
