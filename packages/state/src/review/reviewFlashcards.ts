import type { Flashcard } from "@easyimmerse/types";
import { cacheEntry, type ServerCacheSlice } from "../server/cacheEntry.ts";

/** The project's flashcards as the cached list holds them, which the review takes each card's content from. */
export type ReviewFlashcards = {
  byId: ReadonlyMap<string, Flashcard>;
  /** When the list was last fetched, or null while it is being fetched again. */
  fetchedAtMs: number | null;
};

const maps = new WeakMap<
  readonly Flashcard[],
  ReadonlyMap<string, Flashcard>
>();

/** Returns the project's cached flashcards by id, or null while the list has not loaded. */
export function reviewFlashcardsOf(
  backend: ServerCacheSlice,
  projectId: string,
): ReviewFlashcards | null {
  const entry = cacheEntry(backend, "listFlashcards", projectId);
  const flashcards = entry?.data?.flashcards;
  if (flashcards === undefined) return null;
  return {
    byId: mapOf(flashcards),
    fetchedAtMs:
      entry?.status === "fulfilled" ? (entry.fulfilledTimeStamp ?? 0) : null,
  };
}

/** Indexes a list by id once, so that every action does not index it again. */
function mapOf(flashcards: readonly Flashcard[]) {
  const known = maps.get(flashcards);
  if (known) return known;
  const map = new Map(flashcards.map((flashcard) => [flashcard.id, flashcard]));
  maps.set(flashcards, map);
  return map;
}
