import { InternalError } from 'scrivito_sdk/common';

let jrApiLocation: string | undefined;

export function getJrApiLocation(): string {
  if (!jrApiLocation) throw new InternalError();

  return jrApiLocation;
}

export function setJrApiLocation(url: string) {
  jrApiLocation = url;
}
