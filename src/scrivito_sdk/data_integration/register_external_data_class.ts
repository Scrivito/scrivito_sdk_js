import { UncheckedDataConnection } from 'scrivito_sdk/data_integration';
import {
  LazyAsyncDataClassSchema,
  registerDataClassSchema,
} from 'scrivito_sdk/data_integration/data_class_schema';
import { setExternalDataConnection } from 'scrivito_sdk/data_integration/external_data_connection';

interface DataClassParams {
  connection: Promise<Partial<UncheckedDataConnection>>;
  schema: LazyAsyncDataClassSchema;
}

export async function registerExternalDataClass(
  name: string,
  params: Promise<DataClassParams>
): Promise<void> {
  const { connection, schema } = await params;

  setExternalDataConnection(name, connection);
  registerDataClassSchema(name, schema);
}
