import type { AppState } from "../app/appState.ts";
import type { ReadableState } from "../app/feature.ts";
import type { CachedQueries, ServerCacheSlice } from "./cacheEntry.ts";
import { cacheKey } from "./cacheKey.ts";
import type { ServerResponses } from "./serverRequest.ts";

/** An empty server cache, for tests. */
export const emptyServerCache: ServerCacheSlice = { queries: {} };

/** Returns what an update may read, for tests: the given app state and an empty server cache. */
export function withEmptyServerCache(app: AppState): ReadableState {
  return { ...app, backend: emptyServerCache };
}

/** Returns the server cache with one more query answered, for tests. */
export function serverCacheWith<K extends keyof CachedQueries>(
  endpointName: K,
  queryArgs: CachedQueries[K],
  data: ServerResponses[K],
  slice: ServerCacheSlice = emptyServerCache,
): ServerCacheSlice {
  const key = cacheKey(endpointName, queryArgs);
  const entry = { status: "fulfilled", data };
  return { ...slice, queries: { ...slice.queries, [key]: entry } };
}
