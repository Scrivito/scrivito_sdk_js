import { ObjSpaceId } from 'scrivito_sdk/client';
import {
  ContinueIterable,
  ContinueIterator,
  IteratorResult,
} from 'scrivito_sdk/common';
import { ObjData, getObjData } from 'scrivito_sdk/data';
import {
  ObjIdQuery,
  ObjQueryContinuation,
} from 'scrivito_sdk/data/obj_id_query';
import { QueryParams } from 'scrivito_sdk/data/obj_id_query_batch';

export class ObjDataQuery
  implements ContinueIterable<ObjData, ObjQueryContinuation> {
  private readonly idQuery: ObjIdQuery;

  constructor(
    private readonly objSpaceId: ObjSpaceId,
    params: QueryParams,
    batchSize: number
  ) {
    this.idQuery = new ObjIdQuery(objSpaceId, params, batchSize);
  }

  count(): number {
    return this.idQuery.count();
  }

  iterator(): ContinueIterator<ObjData, ObjQueryContinuation> {
    return this.objDataQueryIterator(this.idQuery.iterator());
  }

  iteratorFromContinuation(
    continuation: ObjQueryContinuation
  ): ContinueIterator<ObjData, ObjQueryContinuation> {
    const iterator = this.idQuery.iteratorFromContinuation(continuation);

    return this.objDataQueryIterator(iterator);
  }

  private objDataQueryIterator(
    iterator: ContinueIterator<string, ObjQueryContinuation>
  ) {
    return new ObjDataQueryIterator(this.objSpaceId, iterator);
  }
}

class ObjDataQueryIterator
  implements ContinueIterator<ObjData, ObjQueryContinuation> {
  private done?: { done: true };

  constructor(
    private readonly objSpaceId: ObjSpaceId,
    private readonly iterator: ContinueIterator<string, ObjQueryContinuation>
  ) {}

  next(): IteratorResult<ObjData> {
    if (this.done) return this.done;

    const id = this.iterator.next().value;
    if (!id) return this.stop();

    const objData = getObjData(this.objSpaceId, id);

    if (objData === undefined) return this.stop();

    if (objData.isUnavailable()) return this.next();

    return { value: objData, done: false };
  }

  continuation() {
    return this.iterator?.continuation();
  }

  private stop() {
    this.done = { done: true };

    return this.done;
  }
}
