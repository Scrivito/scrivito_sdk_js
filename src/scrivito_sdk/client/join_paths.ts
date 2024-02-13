export function joinPaths(startPath: string, endPath: string): string {
  return `${startPath}/${endPath.replace(/^\//, '')}`;
}
