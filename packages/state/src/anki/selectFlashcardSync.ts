import type { Flashcard, FlashcardContent } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { type CacheEntry, cacheEntry } from "../server/cacheEntry.ts";
import { cachedFlashcards, cachedUsesAnkiConnect } from "./ankiCache.ts";
import {
  isChangedSinceExport,
  isNewOrChangedSinceExport,
  isUnexported,
  isUnsent,
  oldestFirst,
} from "./ankiExportSelection.ts";
import { hasAnkiConnectRequest } from "./ankiRequests.ts";

/** Whether Anki answered the last check: still being asked, answered, did not answer, or answered that it refuses easyImmerse. */
export type AnkiConnectionStatus =
  | "checking"
  | "connected"
  | "unreachable"
  | "denied";

/** What the project overview's flashcards panel shows about packages for Anki, which can always be exported. */
export type PackageSync = {
  /** The flashcards new and changed since they were last marked as exported, or null while none ever was. */
  sinceLastExport: { newCount: number; changedCount: number } | null;
};

/** What the project overview's flashcards panel shows about AnkiConnect while it is on for the project. */
export type AnkiConnectSync = {
  connection: AnkiConnectionStatus;
  /** The origin Anki refused, while it refuses easyImmerse and the origin is known, or null otherwise. */
  deniedOrigin: string | null;
  unsentCount: number;
  /** The deleted flashcards whose notes are still to be deleted from Anki. */
  pendingDeletionCount: number;
  /** Whether a send of the project's flashcards, or a deletion of its notes from Anki, is under way or waiting. */
  isSyncing: boolean;
};

/** What the project overview's flashcards panel shows about each way the project's flashcards reach Anki. */
export type FlashcardSync = {
  /** Every flashcard of the project. */
  flashcardCount: number;
  package: PackageSync;
  /** Null while AnkiConnect is off for the project. */
  ankiConnect: AnkiConnectSync | null;
  /** The first-made flashcard waiting to reach Anki: through AnkiConnect while it is on, and otherwise in the next export. */
  nextCard: FlashcardContent | null;
};

/**
 * Selects how the project's flashcards reach Anki, from the cached project, flashcards and pending deletions from Anki,
 * and the last check of the connection to Anki.
 * The result keeps its reference while those do.
 */
export const selectFlashcardSync = createSelector(
  [
    (root: RootState, projectId: string) =>
      cachedUsesAnkiConnect(root.backend, projectId),
    (root: RootState, projectId: string) =>
      cachedFlashcards(root.backend, projectId),
    (root: RootState) =>
      cacheEntry(root.backend, "checkAnkiConnection", undefined),
    (root: RootState, projectId: string) =>
      hasAnkiConnectRequest(root.app.operations.requests, projectId),
    (root: RootState, projectId: string) =>
      cacheEntry(root.backend, "listAnkiPendingDeletions", projectId)?.data
        ?.deletions.length ?? 0,
  ],
  (
    usesAnkiConnect,
    flashcards,
    connection,
    isSyncing,
    pendingDeletionCount,
  ): FlashcardSync => ({
    flashcardCount: flashcards.length,
    package: { sinceLastExport: sinceLastExport(flashcards) },
    ankiConnect: usesAnkiConnect
      ? {
          connection: statusOf(connection),
          deniedOrigin: deniedOriginOf(connection),
          unsentCount: flashcards.filter(isUnsent).length,
          pendingDeletionCount,
          isSyncing,
        }
      : null,
    nextCard: firstMadeContent(
      flashcards.filter(usesAnkiConnect ? isUnsent : isNewOrChangedSinceExport),
    ),
  }),
);

function sinceLastExport(flashcards: readonly Flashcard[]) {
  if (flashcards.every(isUnexported)) return null;
  return {
    newCount: flashcards.filter(isUnexported).length,
    changedCount: flashcards.filter(isChangedSinceExport).length,
  };
}

function firstMadeContent(flashcards: readonly Flashcard[]) {
  return oldestFirst(flashcards)[0]?.content ?? null;
}

function deniedOriginOf(entry: CacheEntry<"checkAnkiConnection">) {
  const connection = entry?.status === "pending" ? undefined : entry?.data;
  return connection?.connected === false && connection.isDenied
    ? connection.origin
    : null;
}

function statusOf(
  entry: CacheEntry<"checkAnkiConnection">,
): AnkiConnectionStatus {
  if (entry === undefined || entry.status === "pending") return "checking";
  const connection = entry.data;
  if (connection?.connected) return "connected";
  return connection?.isDenied ? "denied" : "unreachable";
}
