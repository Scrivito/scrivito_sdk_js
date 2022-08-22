export interface DataClassConnection {
  get: GetCallback;
}

type GetCallback = (id: string) => Promise<Object | null>;

const connections = new Map<string, DataClassConnection>();

export function storeDataClassConnection(
  name: string,
  connection: DataClassConnection
): void {
  connections.set(name, connection);
}

export function getDataClassConnection(
  name: string
): DataClassConnection | undefined {
  return connections.get(name);
}

export function isDataClassProvided(name: string): boolean {
  return connections.has(name);
}

// For test purpose only.
export function resetDataClassStore(): void {
  connections.clear();
}
