import type { BackendClient } from "./backendClient.ts";
import type { ServerConfig } from "./resolveServerConfig.ts";

let configuredClient: BackendClient | null = null;
let configuredServer: ServerConfig | null = null;

/**
 * Sets the client every backend request goes through, and the server it talks to, when there is one.
 * An app calls this once at startup. Hooks that build URLs for media elements read the server from here.
 */
export function configureBackend(
  client: BackendClient,
  server: ServerConfig | null = null,
): void {
  configuredClient = client;
  configuredServer = server;
}

/** The server the configured client talks to, or null when the app runs offline. */
export function getServerConfig(): ServerConfig | null {
  return configuredServer;
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
  configuredServer = null;
}
