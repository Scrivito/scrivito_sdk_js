import { BackendResponse } from 'scrivito_sdk/client/cms_rest_api';
import { UnauthorizedError } from 'scrivito_sdk/client/unauthorized_error';
import {
  Verification,
  VerificationForChallenge,
  Verificator,
  fetch as fetchVerificatorFunction,
} from 'scrivito_sdk/client/verificator_functions';
import { ScrivitoPromise, promiseAndFinally } from 'scrivito_sdk/common';

export const ERROR_CODE_CLIENT_VERIFICATION_REQUIRED =
  'client_verification_required';

interface Challenge {
  verificator: Verificator;
  data: unknown;
}

class VerificationRequiredError extends UnauthorizedError {
  details!: Challenge;
}

interface CurrentComputation {
  challenge: Challenge;
  promise: Promise<string>;
}

let computation: CurrentComputation | undefined;
let verification: Verification | undefined;

export function authorize(
  request: (authorization: string | undefined) => Promise<BackendResponse>
): Promise<BackendResponse> {
  function handleError(error: Error): Promise<BackendResponse> {
    if (!isVerificationRequiredError(error)) throw error;
    return computeVerification(error.details).then(request).catch(handleError);
  }

  return request(currentAuthorization()).catch(handleError);
}

function computeVerification(challenge: Challenge) {
  if (!computation) {
    // note that further request's challenges are ignored (intentionally)
    const { verificator, data } = challenge;
    const promise = fetchVerificatorFunction(
      verificator.id,
      verificator.url
    ).then(
      (compute: VerificationForChallenge) =>
        new ScrivitoPromise<string>((resolve) => {
          function captureVerification(
            computedVerification: Verification
          ): void {
            verification = computedVerification;
            resolve(verification.authorization);
          }
          compute(data, captureVerification);
        })
    );

    computation = {
      challenge: { verificator, data },
      promise: promiseAndFinally<string>(promise, () => {
        computation = undefined;
      }),
    };
  }
  return computation.promise;
}

export function reset(): void {
  computation = undefined;
  verification = undefined;
}

function currentAuthorization(): string | undefined {
  if (!verification) {
    return;
  }

  if (verification.expiresAfter < new Date()) {
    verification = undefined;
    return;
  }
  return verification.authorization;
}

function isVerificationRequiredError(
  error: Error
): error is VerificationRequiredError {
  return (
    error instanceof UnauthorizedError &&
    error.code === ERROR_CODE_CLIENT_VERIFICATION_REQUIRED
  );
}

// integration test support
export function currentState(): string | null {
  const authorization = currentAuthorization();
  if (authorization) {
    return `Authorization: ${authorization}`;
  }

  if (computation) {
    const challenge = computation.challenge;
    return `Pending computation: ${challenge.verificator.id} with ${challenge.data}`;
  }

  return null;
}
