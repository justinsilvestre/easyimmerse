export type ServerConfig = { serverUrl: string; token: string };

declare global {
  /** Injected by a native shell before the app's script runs. */
  var __EASYIMMERSE__: ServerConfig | undefined;
}

const storageKey = "easyimmerse.server";

/**
 * Finds the server to talk to, or null when the app should run offline.
 *
 * Sources in priority order: a config injected on `globalThis`, Vite environment variables,
 * then a JSON entry saved in local storage.
 */
export function resolveServerConfig(
  env: Record<string, string | undefined> = import.meta.env,
  storage: Storage | null = readDefaultStorage(),
): ServerConfig | null {
  return (
    globalThis.__EASYIMMERSE__ ??
    readEnvConfig(env) ??
    readStoredConfig(storage)
  );
}

function readEnvConfig(
  env: Record<string, string | undefined>,
): ServerConfig | null {
  const serverUrl = env.VITE_EASYIMMERSE_SERVER_URL;
  const token = env.VITE_EASYIMMERSE_TOKEN;
  if (!serverUrl || !token) return null;
  return { serverUrl, token };
}

function readStoredConfig(storage: Storage | null): ServerConfig | null {
  const stored = storage?.getItem(storageKey);
  if (!stored) return null;
  try {
    return parseServerConfig(JSON.parse(stored));
  } catch {
    return null;
  }
}

function parseServerConfig(value: unknown): ServerConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const { serverUrl, token } = value as Partial<ServerConfig>;
  if (typeof serverUrl !== "string" || typeof token !== "string") return null;
  return { serverUrl, token };
}

/** Node exposes a local storage global that throws when it is not backed by a file. */
function readDefaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
