import {
  BackendQueryRetrievalParams,
  BackendValueBoost,
  ObjSpaceId,
  OrderByItem,
  Query,
  QueryResponse,
  cmsRetrieval,
  getWorkspaceId,
  isEmptySpaceId,
} from 'scrivito_sdk/client';
import { ScrivitoPromise } from 'scrivito_sdk/common';
import { getContentStateId } from 'scrivito_sdk/data';
import { preloadObjData } from 'scrivito_sdk/data/obj_data_store';
import { objReplicationPool } from 'scrivito_sdk/data/obj_replication_pool';
import {
  LoadableCollection,
  LoadableData,
  LoaderApi,
  load,
  loadableWithDefault,
} from 'scrivito_sdk/loadable';

export interface QueryData {
  results: string[];
  total: number;
  continuation?: string;
}

const FALLBACK_RESPONSE: QueryData = {
  results: [],
  total: 0,
};

export interface QueryParams {
  query: Query[];
  boost?: BackendValueBoost[];
  offset?: number;
  orderBy?: OrderByItem[];
  includeDeleted?: true;
  includeEditingAssets?: true;
}

type CollectionKey = [ObjSpaceId, QueryParams, number];

const loadableCollection = new LoadableCollection({
  recordedAs: 'objquery',
  loadElement: (key: CollectionKey, batchSize: number) => ({
    loader: (api) => loader(key, api, batchSize),
    invalidation: () =>
      loadableWithDefault(undefined, () => getContentStateId(key[0])) || '',
  }),
});

export class ObjIdQueryBatch {
  private readonly data?: LoadableData<QueryResponse>;
  private readonly fakeData?: QueryData;

  constructor(
    objSpaceId: ObjSpaceId,
    params: QueryParams,
    batchSize: number,
    index: number
  ) {
    if (isEmptySpaceId(objSpaceId)) return;

    this.data = loadableCollection.get([objSpaceId, params, index], batchSize);
    if (fakeQuery) {
      this.fakeData = fakeQuery(objSpaceId, params, batchSize, index);
    }
  }

  objIds() {
    return this.response().results;
  }

  count() {
    return this.response().total || 0;
  }

  continuationForNextBatch(): string | undefined {
    return this.response().continuation;
  }

  private response() {
    if (!this.data) return FALLBACK_RESPONSE;

    if (this.fakeData && !this.data.isAvailable()) return this.fakeData;

    return this.data.getWithDefault(FALLBACK_RESPONSE);
  }
}

// For test purposes only
export function storeObjIdQueryBatch(
  objSpaceId: ObjSpaceId,
  params: QueryParams,
  index: number,
  result: QueryResponse
) {
  loadableCollection.get([objSpaceId, params, index]).set(result);
}

let includeObjs = true;

// For test purposes only
export function resetIncludeObjs() {
  includeObjs = true;
}

function loader(
  [objSpaceId, params, index]: CollectionKey,
  { push, wasCancelled }: LoaderApi,
  batchSize: number
): Promise<QueryData> {
  return fetchContinuation(objSpaceId, params, batchSize, index).then(
    (continuation) => {
      if (wasCancelled()) {
        // if the load was cancelled, this error will never surface anywhere
        throw new Error();
      }

      const {
        query,
        boost,
        offset,
        orderBy,
        includeDeleted,
        includeEditingAssets,
      } = params;
      const requestParams: BackendQueryRetrievalParams = {
        query,
        options: { site_aware: true },
        size: batchSize,
        continuation,
        include_objs: includeObjs,
        boost,
        offset,
        order_by: orderBy,
      };
      if (includeDeleted) requestParams.options.include_deleted = true;
      if (includeEditingAssets) {
        requestParams.options.include_editing_assets = true;
      }

      const workspaceId = getWorkspaceId(objSpaceId);
      return cmsRetrieval
        .retrieveObjQuery(workspaceId, requestParams)
        .then((response) => {
          // including Objs only makes sense for the first request(s), since
          // afterwards many Objs will already be cached locally.
          includeObjs = false;

          const includedObjs = response.objs;
          push(() => {
            if (includedObjs) {
              includedObjs.forEach((objJson) => {
                objReplicationPool
                  .get(objSpaceId, objJson._id)
                  .notifyBackendState(objJson);
              });
            }

            response.results.forEach((id) => preloadObjData(objSpaceId, id));
          });

          return {
            results: response.results,
            total: response.total,
            continuation: response.continuation,
          };
        });
    }
  );
}

function fetchContinuation(
  objSpaceId: ObjSpaceId,
  params: QueryParams,
  batchSize: number,
  index: number
): Promise<string | undefined> {
  if (index > 0) {
    const previousBatch = new ObjIdQueryBatch(
      objSpaceId,
      params,
      batchSize,
      index - 1
    );
    return load(() => previousBatch.continuationForNextBatch());
  }

  return ScrivitoPromise.resolve(undefined);
}

// For test purposes only
export function setupFakeObjIdQuery(
  searchFn: (
    ...args: ConstructorParameters<typeof ObjIdQueryBatch>
  ) => QueryData
) {
  fakeQuery = searchFn;
}

// For test purposes only
export function clearFakeObjIdQuery() {
  fakeQuery = undefined;
}

// For test purposes only
export function usesFakeObjIdQuery(): boolean {
  return !!fakeQuery;
}

let fakeQuery:
  | ((...args: ConstructorParameters<typeof ObjIdQueryBatch>) => QueryData)
  | undefined;
