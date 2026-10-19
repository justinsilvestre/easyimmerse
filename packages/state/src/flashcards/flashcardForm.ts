import type { DictionarySummary, FlashcardDraft } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { FlashcardCard } from "./flashcardCard.ts";

/** The flashcard open in the flashcard-editing form, with how far its save has got. */
export type FlashcardForm = {
  card: FlashcardCard;
  stage: SaveStage;
  /** The lookup whose answer fills the card's untyped fields, until it answers, fails, or the word is changed. */
  lookup: { requestId: string; context: LookupFieldsContext } | null;
  /** The save or deletion this opening sent. Its outcome reaches the form only while this id is here. */
  sentRequestId: string | null;
  /** How the save the user last asked for failed; the form says so until Save is pressed again. */
  saveFailure: RequestFailure | null;
  rollbackIfDiscarded: Rollback | null;
};

/**
 * Where the open card stands on its way to being saved:
 * - `editing`: open for changes;
 * - `awaitingLookup`: a new card whose word's lookup has yet to answer, after the form opened without it;
 * - `awaitingLookupToSave`: the same, with a save the user asked for waiting until the lookup answers, fails or takes too long;
 * - `sending`: a save on its way, during which Save does nothing.
 */
export type SaveStage =
  | "editing"
  | "awaitingLookup"
  | "awaitingLookupToSave"
  | "sending";

/** The project's languages and dictionaries, which sort a lookup's definitions into the L1 and L2 fields. */
export type LookupFieldsContext = {
  languages: { target: string; translation: string };
  dictionaries: readonly DictionarySummary[];
};

/** What a card in doubt sends if the user discards it. */
export type Rollback = {
  /** The content the flashcard held before the save in doubt, or null to delete a new flashcard. */
  content: FlashcardDraft | null;
  /** The Retry under way that put the card in doubt, whose failure for any reason but its time limit takes the card out of doubt; null once a save has timed out. */
  retryRequestId: string | null;
};

/** The slices of the app state that the flashcard rules read: the requests, the route and the open form. */
export type FlashcardApp = Pick<AppState, "operations" | "route" | "screen">;

/** The form as it opens on a card, editable and with no save of its own. */
export function openedForm(
  card: FlashcardCard,
  rollbackIfDiscarded: Rollback | null = null,
): FlashcardForm {
  return {
    card,
    stage: "editing",
    lookup: null,
    sentRequestId: null,
    saveFailure: null,
    rollbackIfDiscarded,
  };
}

/** Tells whether the card waits for its word's lookup, with or without a save. */
export function isAwaitingLookup(stage: SaveStage): boolean {
  return stage === "awaitingLookup" || stage === "awaitingLookupToSave";
}

/** Tells whether the user has pressed Save, from when on the form is read-only, so that what is saved is what was shown. */
export function isLocked(stage: SaveStage): boolean {
  return stage === "awaitingLookupToSave" || stage === "sending";
}

/** Tells the form whether its save waits for definitions, is under way, or is free to ask for. */
export function saveStatusOf(
  stage: SaveStage,
): "idle" | "waitingForDefinitions" | "saving" {
  switch (stage) {
    case "editing":
    case "awaitingLookup":
      return "idle";
    case "awaitingLookupToSave":
      return "waitingForDefinitions";
    case "sending":
      return "saving";
  }
}
