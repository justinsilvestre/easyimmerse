import type { Flashcard, FlashcardContent } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { type CacheEntry, cacheEntry } from "../server/cacheEntry.ts";
import { cachedDestination, cachedFlashcards } from "./ankiCache.ts";
import { isUnexported, isUnsent, oldestFirst } from "./ankiExportSelection.ts";

/** Whether Anki answered the last check: still being asked, answered, or not. */
export type AnkiConnectionStatus = "checking" | "connected" | "unreachable";

/** Where a project's flashcards go, with what the project overview's flashcards panel shows about it. */
export type FlashcardSync =
  | { kind: "notStarted" }
  | {
      kind: "ankiPackage";
      unexportedCount: number;
      /** The first-made flashcard never exported. */
      nextCard: FlashcardContent | null;
    }
  | {
      kind: "ankiConnect";
      connection: AnkiConnectionStatus;
      unsentCount: number;
      /** The first-made flashcard Anki has no note for. */
      nextCard: FlashcardContent | null;
      /** Whether a send of the project's flashcards is under way or waiting. */
      isSending: boolean;
    };

/**
 * Selects where the project's flashcards go, from the cached project and flashcards and the last check of the connection to Anki.
 * The result keeps its reference while those do.
 */
export const selectFlashcardSync = createSelector(
  [
    (root: RootState, projectId: string) =>
      cachedDestination(root.backend, projectId),
    (root: RootState, projectId: string) =>
      cachedFlashcards(root.backend, projectId),
    (root: RootState) =>
      cacheEntry(root.backend, "checkAnkiConnection", undefined),
    (root: RootState, projectId: string) => isSending(root, projectId),
  ],
  (destination, flashcards, connection, sending): FlashcardSync => {
    switch (destination) {
      case null:
        return { kind: "notStarted" };
      case "anki_package": {
        const unexported = flashcards.filter(isUnexported);
        return {
          kind: "ankiPackage",
          unexportedCount: unexported.length,
          nextCard: firstMadeContent(unexported),
        };
      }
      case "anki_connect": {
        const unsent = flashcards.filter(isUnsent);
        return {
          kind: "ankiConnect",
          connection: statusOf(connection),
          unsentCount: unsent.length,
          nextCard: firstMadeContent(unsent),
          isSending: sending,
        };
      }
    }
  },
);

function firstMadeContent(flashcards: readonly Flashcard[]) {
  return oldestFirst(flashcards)[0]?.content ?? null;
}

function statusOf(entry: CacheEntry<"checkAnkiConnection">) {
  if (entry === undefined || entry.status === "pending") return "checking";
  return entry.data?.connected ? "connected" : "unreachable";
}

function isSending(root: RootState, projectId: string): boolean {
  return root.app.operations.requests.some(
    ({ request }) =>
      request.kind === "sendFlashcardsToAnki" &&
      request.projectId === projectId,
  );
}
