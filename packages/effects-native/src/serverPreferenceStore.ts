import type { ServerConfig } from "@easyimmerse/backend";
import type { PreferenceStore } from "@easyimmerse/effects-web";

/** Persists preferences through the embedded server's `/preferences/{key}` routes. */
export function createServerPreferenceStore(
  server: ServerConfig,
  fetchFn: typeof fetch = globalThis.fetch,
): PreferenceStore {
  const request = (key: string, init: RequestInit) =>
    fetchFn(buildUrl(server, key), withAuthorization(server, init));
  return {
    save: async (key, value) => {
      const response = await request(key, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      assertOk(response, "save");
    },
    load: async (key) => {
      const response = await request(key, { method: "GET" });
      assertOk(response, "load");
      return readValue(await response.json());
    },
  };
}

function buildUrl(server: ServerConfig, key: string): string {
  return new URL(
    `/preferences/${encodeURIComponent(key)}`,
    server.serverUrl,
  ).toString();
}

function withAuthorization(
  server: ServerConfig,
  init: RequestInit,
): RequestInit {
  return {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${server.token}` },
  };
}

function assertOk(response: Response, operation: string): void {
  if (response.ok) return;
  throw new Error(
    `Could not ${operation} the preference: the server answered ${response.status}.`,
  );
}

function readValue(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("value" in body))
    return null;
  return typeof body.value === "string" ? body.value : null;
}
