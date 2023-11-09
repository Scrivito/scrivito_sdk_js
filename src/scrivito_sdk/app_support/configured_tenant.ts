import { Deferred } from 'scrivito_sdk/common';

let configuredTenant: string | undefined;
let deferredConfiguredTenant = new Deferred<string | undefined>();

export function getConfiguredTenant(): string | undefined {
  return configuredTenant;
}

export async function ensureConfiguredTenant(): Promise<string | undefined> {
  return deferredConfiguredTenant;
}

export function hasTenantConfigurationBeenSet(): boolean {
  return !deferredConfiguredTenant.isPending();
}

export function setConfiguredTenant(tenant: string | undefined): void {
  configuredTenant = tenant;
  deferredConfiguredTenant.resolve(tenant);
}

// (not relevant for SDK) has this UI been configured to not access any tenant?
export function isConfiguredWithoutTenant(): boolean {
  return hasTenantConfigurationBeenSet() && configuredTenant === undefined;
}

export function resetConfiguredTenant(): void {
  deferredConfiguredTenant = new Deferred();
  configuredTenant = undefined;
}
