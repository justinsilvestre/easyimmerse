import type {
  AnkiPendingDeletion,
  Flashcard,
  FlashcardContent,
} from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { type CacheEntry, cacheEntry } from "../server/cacheEntry.ts";
import {
  cachedDeletions,
  cachedFlashcards,
  cachedUsesAnkiConnect,
} from "./ankiCache.ts";
import { oldestFirst } from "./ankiExportSelection.ts";
import { hasAnkiConnectRequest } from "./ankiRequests.ts";
import { ankiSearchOf } from "./ankiSearch.ts";
import { hasSyncFailed } from "./ankiSyncFailures.ts";
import {
  isChangedSinceDelivered,
  isNeverDelivered,
  isQueued,
} from "./ankiUpdatesQueue.ts";

/** Whether Anki answered the last check: still being asked, answered, did not answer, or answered that it refuses easyImmerse. */
export type AnkiConnectionStatus =
  | "checking"
  | "connected"
  | "unreachable"
  | "denied";

/**
 * The project's Anki updates queue: the flashcards never delivered to Anki and those changed since.
 * A send through AnkiConnect delivers a flashcard, and so does an export that marks it as exported.
 */
export type AnkiUpdatesQueue = {
  newCount: number;
  changedCount: number;
  /** Whether any flashcard of the project was ever delivered to Anki, which removes it from the queue. */
  hasBeenFlushed: boolean;
};

/** What the project overview's flashcards panel shows about packages for Anki, which can always be exported. */
export type PackageSync = {
  /** The deleted flashcards whose notes may still be in Anki, oldest first, listed while AnkiConnect is off. */
  deletions: readonly AnkiPendingDeletion[];
  /** The Anki search that finds the notes of the listed deletions. */
  ankiSearch: string;
};

/** What the project overview's flashcards panel shows about AnkiConnect while it is on for the project. */
export type AnkiConnectSync = {
  connection: AnkiConnectionStatus;
  /** The origin Anki refused, while it refuses easyImmerse and the origin is known, or null otherwise. */
  deniedOrigin: string | null;
  /** The deleted flashcards whose notes are still to be deleted from Anki. */
  pendingDeletionCount: number;
  /** Whether a send of the project's flashcards, or a deletion of its notes from Anki, is under way or waiting. */
  isSyncing: boolean;
  /** Whether the last send or deletion failed while Anki stays connected, and nothing has been tried since. */
  hasSyncFailed: boolean;
};

/** What the project overview's flashcards panel shows about each way the project's flashcards reach Anki. */
export type FlashcardSync = {
  /** Every flashcard of the project. */
  flashcardCount: number;
  queue: AnkiUpdatesQueue;
  package: PackageSync;
  /** Null while AnkiConnect is off for the project. */
  ankiConnect: AnkiConnectSync | null;
  /** The first-made flashcard in the Anki updates queue. */
  nextCard: FlashcardContent | null;
};

/**
 * Selects how the project's flashcards reach Anki, from the cached project, flashcards and pending deletions from Anki,
 * the last check of the connection to Anki, and the last failed send and deletion.
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
      cachedDeletions(root.backend, projectId),
    (root: RootState, projectId: string) =>
      hasSyncFailed(root.app.operations.failedRequests, projectId),
  ],
  (
    usesAnkiConnect,
    flashcards,
    connection,
    isSyncing,
    deletions,
    hasFailed,
  ): FlashcardSync => ({
    flashcardCount: flashcards.length,
    queue: queueOf(flashcards),
    package: packageSync(usesAnkiConnect ? noDeletions : deletions),
    ankiConnect: usesAnkiConnect
      ? {
          connection: statusOf(connection),
          deniedOrigin: deniedOriginOf(connection),
          pendingDeletionCount: deletions.length,
          isSyncing,
          hasSyncFailed:
            hasFailed && !isSyncing && statusOf(connection) === "connected",
        }
      : null,
    nextCard: firstMadeContent(flashcards.filter(isQueued)),
  }),
);

const noDeletions: readonly AnkiPendingDeletion[] = [];

function packageSync(deletions: readonly AnkiPendingDeletion[]): PackageSync {
  return {
    deletions,
    ankiSearch: ankiSearchOf(deletions.map(({ flashcard_id }) => flashcard_id)),
  };
}

function queueOf(flashcards: readonly Flashcard[]): AnkiUpdatesQueue {
  const newCount = flashcards.filter(isNeverDelivered).length;
  return {
    newCount,
    changedCount: flashcards.filter(isChangedSinceDelivered).length,
    hasBeenFlushed: newCount < flashcards.length,
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
