import type {
  AnkiPendingDeletions,
  Document,
  ListDictionariesResponse,
  ListProjectsResponse,
  MediaFile,
  PlaybackMethodRequest,
  ReviewSummary,
  TimedTextTrack,
} from "@easyimmerse/types";
import type { PickedMediaFile } from "../platform/effects.ts";
import { cacheKey } from "./cacheKey.ts";
import type { ServerResponses } from "./serverRequest.ts";

/** Where the store keeps the server cache. */
export const serverCachePath = "backend";

/** The part of the server cache's slice that state code reads: every query's entry by its key. */
export type ServerCacheSlice = {
  queries: Partial<
    Record<
      string,
      {
        status: string;
        data?: unknown;
        error?: unknown;
        /** When the query last succeeded, in milliseconds since the Unix epoch. */
        fulfilledTimeStamp?: number;
      }
    >
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
  listSubtitleTracks: { projectId: string; mediaFileId: string };
  getSubtitleCues: { projectId: string; mediaFileId: string; trackId: string };
  probePictures: PickedMediaFile;
  getProject: string;
  listMediaFiles: string;
  listAlignments: { projectId: string; mediaFileId: string };
  /** A book's parsed text, cached under the name and source of its media file. */
  openBook: Pick<MediaFile, "name" | "source">;
  listFlashcards: string;
  listAnkiPendingDeletions: string;
  listDictionaries: undefined;
  listProjects: undefined;
  checkAnkiConnection: undefined;
  getReviewSummary: string;
};

/** The data of each query whose entry state code reads: a request's data, or that of a query only components send. */
export type CachedResponses = ServerResponses & {
  listAnkiPendingDeletions: AnkiPendingDeletions;
  openBook: Document;
  listDictionaries: ListDictionariesResponse;
  listProjects: ListProjectsResponse;
  getSubtitleCues: TimedTextTrack;
  getReviewSummary: ReviewSummary;
};

/** A query's entry in the server cache: its answer, or the error it failed with. Undefined while the cache holds none. */
export type CacheEntry<K extends keyof CachedQueries> =
  | {
      status: string;
      data?: CachedResponses[K];
      error?: { code?: string; message?: string };
      /** When the query last succeeded, in milliseconds since the Unix epoch. */
      fulfilledTimeStamp?: number;
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
