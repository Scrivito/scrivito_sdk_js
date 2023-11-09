import type { ApiKeyAuthorizationProvider } from 'scrivito_sdk/node_support/api_key_authorization_provider';

export let nodeAdapter: NodeAdapter | undefined;

interface NodeAdapter {
  ApiKeyAuthorizationProvider: typeof ApiKeyAuthorizationProvider;
}

export function setNodeAdapter(adapter: NodeAdapter) {
  nodeAdapter = adapter;
}

export function isRunningInBrowser() {
  return nodeAdapter === undefined;
}
