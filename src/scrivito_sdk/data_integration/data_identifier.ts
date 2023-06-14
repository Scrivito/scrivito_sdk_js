export type DataIdentifier = string;

export function isValidDataIdentifier(key: string): key is DataIdentifier {
  return (
    !!key.match(/^[a-z]([a-z0-9]|_(?!_)){0,49}$/i) && key.slice(-1) !== '_'
  );
}
