import { onTestResetBeforeEach } from 'scrivito_sdk/common';

let treatLocalhostLike: string | undefined;

export function setTreatLocalhostLike(url: string): void {
  treatLocalhostLike = url;
}

export function getTreatLocalhostLike(): string | undefined {
  return treatLocalhostLike;
}

onTestResetBeforeEach(() => (treatLocalhostLike = undefined));
