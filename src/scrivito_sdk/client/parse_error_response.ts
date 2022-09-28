import { RequestFailedError } from 'scrivito_sdk/client';
import { parseOrThrowRequestFailedError } from './cms_rest_api/parse_or_throw_request_failed_error';

interface BackendError {
  message: string;
  code: string;
  details: Object;
}

/** parses the standard JR backend error response format
 *
 * See
 * https://docs.google.com/document/d/1rZUtyD7nPuY5aApHoTiOf9PJaWSxVxb5mXGcd6pZPDc#heading=h.dt58jqsstqr0
 */
export function parseErrorResponse(responseText: string): BackendError {
  const { error, code, details } = parseOrThrowRequestFailedError(responseText);

  if (typeof error !== 'string') throw new RequestFailedError();

  if (code !== undefined && typeof code !== 'string') {
    throw new RequestFailedError();
  }

  if (details && typeof details !== 'object') throw new RequestFailedError();

  return {
    message: error,
    code: code || '',
    details: details || {},
  };
}
