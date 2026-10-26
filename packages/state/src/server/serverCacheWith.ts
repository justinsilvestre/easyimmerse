import type { AppState } from "../app/appState.ts";
import type { ReadableState } from "../app/feature.ts";
import type {
  CachedQueries,
  CachedResponses,
  ServerCacheSlice,
} from "./cacheEntry.ts";
import { cacheKey } from "./cacheKey.ts";
import type { RequestFailure } from "./serverRequest.ts";

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
  data: CachedResponses[K],
  slice: ServerCacheSlice = emptyServerCache,
): ServerCacheSlice {
  const key = cacheKey(endpointName, queryArgs);
  const entry = { status: "fulfilled", data };
  return { ...slice, queries: { ...slice.queries, [key]: entry } };
}

/** Returns the server cache with one more query rejected with the failure, for tests. */
export function serverCacheWithFailure<K extends keyof CachedQueries>(
  endpointName: K,
  queryArgs: CachedQueries[K],
  error: RequestFailure,
  slice: ServerCacheSlice = emptyServerCache,
): ServerCacheSlice {
  const key = cacheKey(endpointName, queryArgs);
  const entry = { status: "rejected", error };
  return { ...slice, queries: { ...slice.queries, [key]: entry } };
}

/** Returns the server cache with one more query on its way, for tests. */
export function serverCacheWithPending<K extends keyof CachedQueries>(
  endpointName: K,
  queryArgs: CachedQueries[K],
  slice: ServerCacheSlice = emptyServerCache,
): ServerCacheSlice {
  const key = cacheKey(endpointName, queryArgs);
  return {
    ...slice,
    queries: { ...slice.queries, [key]: { status: "pending" } },
  };
}
