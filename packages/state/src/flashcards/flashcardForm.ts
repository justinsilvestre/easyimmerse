import type { DictionarySummary, FlashcardDraft } from "@easyimmerse/types";
import type { FlashcardCard } from "./flashcardCard.ts";
import type { SaveStage } from "./saveStage.ts";

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

/** How the save the user last asked for failed: unanswered or turned away in a way that may pass, or refused outright. */
export type SaveFailure = "failed" | "refused";

/** The flashcard open in the flashcard-editing form, with how far its save has got. */
export type FlashcardForm = {
  card: FlashcardCard;
  stage: SaveStage;
  /** The lookup whose answer fills the card's untyped fields, until it answers, fails, or the word is changed. */
  lookup: { requestId: string; context: LookupFieldsContext } | null;
  /** The save or deletion this opening sent. Its outcome reaches the form only while this id is here. */
  sentRequestId: string | null;
  /** How the save the user last asked for failed; the form says so until Save is pressed again. */
  saveFailure: SaveFailure | null;
  rollbackIfDiscarded: Rollback | null;
};

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
