import { ScrivitoError } from 'scrivito_sdk/common';

export class ClientError extends ScrivitoError {
  constructor(
    readonly message: string,
    readonly code: string,
    readonly details: unknown
  ) {
    super(message);
  }
}
