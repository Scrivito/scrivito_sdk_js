import { ObjSpaceId } from 'scrivito_sdk/client';
import { assertNotUsingInMemoryTenant } from 'scrivito_sdk/data/in_memory_tenant';
import { ObjDataQuery } from 'scrivito_sdk/data/obj_data_query';
import { QueryParams } from 'scrivito_sdk/data/obj_id_query_batch';

export function getObjQuery(
  objSpaceId: ObjSpaceId,
  params: QueryParams,
  batchSize: number
): ObjDataQuery {
  assertNotUsingInMemoryTenant('Search API');
  return new ObjDataQuery(objSpaceId, params, batchSize);
}
