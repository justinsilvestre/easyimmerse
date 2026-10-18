import type { AnkiPendingDeletion, Flashcard } from "@easyimmerse/types";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheEntry } from "../server/cacheEntry.ts";

const noFlashcards: readonly Flashcard[] = [];
const noMediaFileIds: readonly string[] = [];
const noDeletions: readonly AnkiPendingDeletion[] = [];

/** Returns the project's cached deletions from Anki, oldest first, or none while they are not cached. */
export function cachedDeletions(
  backend: ServerCacheSlice,
  projectId: string,
): readonly AnkiPendingDeletion[] {
  return (
    cacheEntry(backend, "listAnkiPendingDeletions", projectId)?.data
      ?.deletions ?? noDeletions
  );
}

/** Tells whether the cached project uses AnkiConnect; false while the project is not cached. */
export function cachedUsesAnkiConnect(
  backend: ServerCacheSlice,
  projectId: string,
): boolean {
  const project = cacheEntry(backend, "getProject", projectId)?.data;
  return project?.uses_anki_connect ?? false;
}

/** Tells whether the last check found Anki running and no check is under way. */
export function cachedIsAnkiConnected(backend: ServerCacheSlice): boolean {
  const check = cacheEntry(backend, "checkAnkiConnection", undefined);
  return check?.status === "fulfilled" && check.data?.connected === true;
}

/** Returns the cached project's name, or null when the project is not cached. */
export function cachedProjectName(
  backend: ServerCacheSlice,
  projectId: string,
): string | null {
  return (
    cacheEntry(backend, "getProject", projectId)?.data?.settings.name ?? null
  );
}

/** Returns the project's cached flashcards, or none while they are not cached. */
export function cachedFlashcards(
  backend: ServerCacheSlice,
  projectId: string,
): readonly Flashcard[] {
  return (
    cacheEntry(backend, "listFlashcards", projectId)?.data?.flashcards ??
    noFlashcards
  );
}

/** Returns the ids of the project's cached media files, or none while they are not cached. */
export function cachedMediaFileIds(
  backend: ServerCacheSlice,
  projectId: string,
): readonly string[] {
  const listed = cacheEntry(backend, "listMediaFiles", projectId)?.data;
  return listed?.media_files.map(({ id }) => id) ?? noMediaFileIds;
}

/**
 * Tells whether the project's pending deletions from Anki are cached as none, and are not being fetched again.
 * A deletion of a flashcard refetches them, so a deletion just recorded is never missed.
 */
export function hasNoPendingDeletion(
  backend: ServerCacheSlice,
  projectId: string,
): boolean {
  const listed = cacheEntry(backend, "listAnkiPendingDeletions", projectId);
  return listed?.status === "fulfilled" && listed.data?.deletions.length === 0;
}
