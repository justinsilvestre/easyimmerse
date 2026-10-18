import type { PreferenceStore } from "@easyimmerse/effects-web";
import type { ServerConfig } from "@easyimmerse/state";

/** Persists preferences through the embedded server's `/preferences/{key}` routes. */
export function createServerPreferenceStore(
  server: ServerConfig,
  fetchFn: typeof fetch = globalThis.fetch,
): PreferenceStore {
  const request = (key: string, init: RequestInit) =>
    fetchFn(buildUrl(server, key), withAuthorization(server, init));
  return {
    save: oneAtATimePerKey(async (key, value) => {
      const response = await request(key, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      assertOk(response, "save");
    }),
    load: async (key) => {
      const response = await request(key, { method: "GET" });
      assertOk(response, "load");
      return readValue(await response.json());
    },
  };
}

/**
 * Sends each key's saves one after another.
 * Requests sent together can reach the server in any order, and an earlier value would then overwrite a later one.
 */
function oneAtATimePerKey(
  save: (key: string, value: string) => Promise<void>,
): (key: string, value: string) => Promise<void> {
  const lastSaves = new Map<string, Promise<void>>();
  return (key, value) => {
    const saving = (lastSaves.get(key) ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => save(key, value));
    lastSaves.set(key, saving);
    return saving;
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
