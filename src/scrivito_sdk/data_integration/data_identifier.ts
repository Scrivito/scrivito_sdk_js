export type DataIdentifier = string;

export function isValidDataIdentifier(key: string): key is DataIdentifier {
  return !!key.match(/^[a-z](_?[a-z0-9]+)*$/i) && key.length <= 50;
}
