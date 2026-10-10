import type { PlaybackMethodRequest } from "@easyimmerse/types";
import { cacheKey } from "./cacheKey.ts";
import type { ServerResponses } from "./serverRequest.ts";

/** Where the store keeps the server cache. */
export const serverCachePath = "backend";

/** The part of the server cache's slice that state code reads: every query's entry by its key. */
export type ServerCacheSlice = {
  queries: Partial<
    Record<string, { status: string; data?: unknown; error?: unknown }>
  >;
};

/** The queries whose entries state code reads, with the arguments each is cached under. */
export type CachedQueries = {
  getMediaTracks: { projectId: string; mediaFileId: string };
  choosePlaybackMethod: {
    projectId: string;
    mediaFileId: string;
    request: PlaybackMethodRequest;
  };
};

/** A query's entry in the server cache: its answer, or the error it failed with. Undefined while the cache holds none. */
export type CacheEntry<K extends keyof CachedQueries> =
  | {
      status: string;
      data?: ServerResponses[K];
      error?: { code?: string; message?: string };
    }
  | undefined;

/** Returns a query's entry from the server cache. The entry keeps its reference until the cache changes it. */
export function cacheEntry<K extends keyof CachedQueries>(
  slice: ServerCacheSlice,
  endpointName: K,
  queryArgs: CachedQueries[K],
): CacheEntry<K> {
  return slice.queries[cacheKey(endpointName, queryArgs)] as CacheEntry<K>;
}
