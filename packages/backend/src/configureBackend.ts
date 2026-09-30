import type { BackendClient } from "./backendClient.ts";

let configuredClient: BackendClient | null = null;

/** Sets the client every backend request goes through. An app calls this once at startup. */
export function configureBackend(client: BackendClient): void {
  configuredClient = client;
}

export function getBackendClient(): BackendClient {
  if (configuredClient === null)
    throw new Error(
      "No backend client is configured. Call configureBackend before using the backend API.",
    );
  return configuredClient;
}

/** Forgets the configured client, so that tests start from a clean state. */
export function resetBackend(): void {
  configuredClient = null;
}
