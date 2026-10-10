import type { FlashcardDraft } from "@easyimmerse/types";
import type { Effect } from "../app/effect.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import type { Rollback } from "./flashcardForm.ts";

/** How long a flashcard request may go unanswered, as when the connection hangs, before it counts as failed. */
const flashcardRequestLimitMs = 30_000;

/** Why a flashcard was saved. It comes back in `requestSettled`, so the settling branch needs nothing else. */
export type SavePurpose =
  | {
      type: "save";
      card: FlashcardCard;
      /** What the flashcard held before this save, which its Undo and a rollback put back; null for a new flashcard. */
      before: FlashcardDraft | null;
      from: "form" | "background" | "retry";
      offersUndo: boolean;
      /** The doubt the card already carried when this save was asked for. */
      rollbackIfDiscarded: Rollback | null;
    }
  /** Puts back the content from before a save. */
  | { type: "undo"; word: string }
  /** Puts back a saved card's content after a discard in doubt. */
  | { type: "rollback"; word: string };

/** Why a flashcard was deleted: from the form, by an Undo of a new flashcard's save, or by a discard in doubt. */
export type DeletePurpose =
  | { type: "delete" }
  | { type: "undo"; word: string }
  | { type: "rollback"; word: string };

/** A request that writes a flashcard. */
export type FlashcardRequest = Extract<
  ServerRequest,
  { kind: "saveFlashcard" } | { kind: "deleteFlashcard" }
>;

/** The scope of a flashcard's requests, which are sent one at a time in the order they were asked for. */
export function flashcardScope(flashcardId: string): string {
  return `flashcard:${flashcardId}`;
}

/** Tells whether a request scope is that of a flashcard. */
export function isFlashcardScope(scope: string | undefined): boolean {
  return scope?.startsWith("flashcard:") ?? false;
}

/** Collects what one update of the flashcards asks for, numbering its requests after those asked for before. */
export type FlashcardOutbox = {
  /** Asks for a flashcard request in its flashcard's scope, with the time limit, and returns the request's id. */
  send(request: FlashcardRequest): string;
  add(...effects: readonly Effect[]): void;
  /** Every effect asked for so far, in order. */
  effects(): readonly Effect[];
  /** How many flashcard requests have been asked for since the app started, these included. */
  count(): number;
};

/** Creates an empty outbox whose first request follows the `count` asked for before. */
export function createFlashcardOutbox(count: number): FlashcardOutbox {
  const effects: Effect[] = [];
  let asked = count;
  return {
    send: (request) => {
      asked += 1;
      const id = `flashcard/${asked}`;
      const scope = flashcardScope(request.flashcardId);
      const timeLimitMs = flashcardRequestLimitMs;
      effects.push({ type: "sendRequest", id, request, scope, timeLimitMs });
      return id;
    },
    add: (...added) => {
      effects.push(...added);
    },
    effects: () => effects,
    count: () => asked,
  };
}
