import { ObjSpaceId } from 'scrivito_sdk/client';
import {
  ContinueIterable,
  ContinueIterator,
  IteratorResult,
} from 'scrivito_sdk/common';
import {
  ObjIdQueryBatch,
  QueryParams,
} from 'scrivito_sdk/data/obj_id_query_batch';

export type ObjQueryContinuation = [number, number];

export class ObjIdQuery
  implements ContinueIterable<string, ObjQueryContinuation> {
  constructor(
    private readonly objSpaceId: ObjSpaceId,
    private readonly params: QueryParams,
    private readonly batchSize: number
  ) {}

  count() {
    return new ObjIdQueryBatch(this.objSpaceId, this.params, 0, 0).count();
  }

  iterator() {
    return new ObjIdQueryIterator(this.objSpaceId, this.params, this.batchSize);
  }

  iteratorFromContinuation(continuation: ObjQueryContinuation) {
    return new ObjIdQueryIterator(
      this.objSpaceId,
      this.params,
      this.batchSize,
      continuation
    );
  }
}

interface ObjIdIndex {
  [objId: string]: true | undefined;
}

class ObjIdQueryIterator
  implements ContinueIterator<string, ObjQueryContinuation> {
  private batchNumber = 0;
  private currentIndex = 0;
  private priorObjIndex?: ObjIdIndex;
  private currentObjIds?: string[];
  private currentBatch: ObjIdQueryBatch | undefined;

  constructor(
    private readonly objSpaceId: ObjSpaceId,
    private readonly params: QueryParams,
    private readonly batchSize: number,
    continuation?: ObjQueryContinuation
  ) {
    if (continuation) {
      [this.batchNumber, this.currentIndex] = continuation;
    }
    this.currentBatch = this.getObjIdQueryBatch();
  }

  next(): IteratorResult<string> {
    if (!this.currentBatch) return { done: true };

    if (!this.currentObjIds) this.currentObjIds = this.currentBatch.objIds();

    if (this.currentIndex >= this.currentObjIds.length) {
      this.currentObjIds = undefined;
      this.currentIndex = 0;

      if (this.currentBatch.continuationForNextBatch()) {
        this.batchNumber = this.batchNumber + 1;
        this.currentBatch = this.getObjIdQueryBatch();
      } else {
        this.currentBatch = undefined;
      }

      return this.next();
    }

    if (!this.priorObjIndex) {
      const objIndex: ObjIdIndex = {};

      if (this.batchNumber > 0) {
        const previousBatch = this.getObjIdQueryBatch(this.batchNumber - 1);
        previousBatch.objIds().forEach((objId) => {
          objIndex[objId] = true;
        });
      }

      const thisBatchPreviousIds = this.currentBatch
        .objIds()
        .slice(0, this.currentIndex);
      thisBatchPreviousIds.forEach((objId) => {
        objIndex[objId] = true;
      });

      this.priorObjIndex = objIndex;
    }

    const objId = this.currentObjIds[this.currentIndex];
    this.currentIndex++;

    if (this.priorObjIndex[objId]) return this.next();
    this.priorObjIndex[objId] = true;

    return {
      value: objId,
      done: false,
    };
  }

  continuation(): ObjQueryContinuation | undefined {
    return this.currentBatch
      ? [this.batchNumber, this.currentIndex]
      : undefined;
  }

  private getObjIdQueryBatch(batchNumber = this.batchNumber) {
    return new ObjIdQueryBatch(
      this.objSpaceId,
      this.params,
      this.batchSize,
      batchNumber
    );
  }
}
