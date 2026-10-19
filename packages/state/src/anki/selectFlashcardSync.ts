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
  isExportedInPackage,
  isNeverDelivered,
  isQueued,
  isSentThroughAnkiConnect,
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
  /** Whether any flashcard of the project was ever sent to Anki through AnkiConnect. */
  hasBeenSent: boolean;
  /** Whether any flashcard of the project was ever marked as exported in an Anki deck package. */
  hasBeenExported: boolean;
};

/** What the project overview's flashcards panel shows about packages for Anki, which can always be exported. */
export type PackageSync = {
  /** The deleted flashcards whose notes may still be in Anki, oldest first, listed while AnkiConnect is off. */
  deletions: readonly AnkiPendingDeletion[];
  /** The Anki search that finds the notes of the listed deletions. */
  ankiSearch: string;
};

/** What the project overview's flashcards panel shows about AnkiConnect. */
export type AnkiConnectSync = {
  /** Whether AnkiConnect is on for the project. */
  isOn: boolean;
  connection: AnkiConnectionStatus;
  /** The origin Anki refused, while it refuses easyImmerse and the origin is known, or null otherwise. */
  deniedOrigin: string | null;
  /** The deleted flashcards whose notes are still to be deleted from Anki. */
  pendingDeletionCount: number;
  /** Whether a send of the project's flashcards, or a deletion of its notes from Anki, is under way or waiting. */
  isSyncing: boolean;
  /** Whether the last send or deletion failed while AnkiConnect is on and Anki stays connected, and nothing has been tried since. */
  hasSyncFailed: boolean;
};

/** What the project overview's flashcards panel shows about the review in easyImmerse. */
export type ReviewSync = {
  /** The cards due for review now, not counting new cards. */
  dueCount: number;
  /** The new cards left to learn today. */
  newCount: number;
  /** When the next review falls due, while nothing is due now, or null when none is scheduled. */
  nextDueAtMs: number | null;
  /** The card the review would show first. */
  nextCard: FlashcardContent | null;
  /** Whether any flashcard of the project has been rated, or has a review scheduled. */
  hasProgress: boolean;
};

/** What the project overview's flashcards panel shows about each way to use the project's flashcards. */
export type FlashcardSync = {
  /** Every flashcard of the project. */
  flashcardCount: number;
  queue: AnkiUpdatesQueue;
  package: PackageSync;
  ankiConnect: AnkiConnectSync;
  /** The first-made flashcard in the Anki updates queue. */
  nextCard: FlashcardContent | null;
  review: ReviewSync;
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
    ankiConnect: {
      isOn: usesAnkiConnect,
      connection: statusOf(connection),
      deniedOrigin: deniedOriginOf(connection),
      pendingDeletionCount: deletions.length,
      isSyncing,
      hasSyncFailed:
        usesAnkiConnect &&
        hasFailed &&
        !isSyncing &&
        statusOf(connection) === "connected",
    },
    nextCard: firstMadeContent(flashcards.filter(isQueued)),
    review: noReview,
  }),
);

/** The review has no backend yet, so no project has review progress. */
const noReview: ReviewSync = {
  dueCount: 0,
  newCount: 0,
  nextDueAtMs: null,
  nextCard: null,
  hasProgress: false,
};

const noDeletions: readonly AnkiPendingDeletion[] = [];

function packageSync(deletions: readonly AnkiPendingDeletion[]): PackageSync {
  return {
    deletions,
    ankiSearch: ankiSearchOf(deletions.map(({ flashcard_id }) => flashcard_id)),
  };
}

function queueOf(flashcards: readonly Flashcard[]) {
  return {
    newCount: flashcards.filter(isNeverDelivered).length,
    changedCount: flashcards.filter(isChangedSinceDelivered).length,
    hasBeenSent: flashcards.some(isSentThroughAnkiConnect),
    hasBeenExported: flashcards.some(isExportedInPackage),
  } satisfies AnkiUpdatesQueue;
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
