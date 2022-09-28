export interface DataClassConnection {
  get: GetCallback;
}

type GetCallback = (id: string) => Promise<Object | null>;

const connections = new Map<string, DataClassConnection>();

export function registerExternalDataClassConnection(
  name: string,
  connection: DataClassConnection
): void {
  connections.set(name, connection);
}

export function getExternalDataClassConnection(
  name: string
): DataClassConnection | undefined {
  return connections.get(name);
}

// For test purpose only.
export function resetExternalDataClassRegistry(): void {
  connections.clear();
}
