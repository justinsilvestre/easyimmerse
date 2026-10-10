import type { Flashcard } from "@easyimmerse/types";
import type { FailedSave } from "./failedSave.ts";
import type { NewCard } from "./flashcardCard.ts";
import type { LookupFieldsContext } from "./flashcardForm.ts";

/** A new card that left the form, or was never opened, while its word's lookup was on its way; it is saved once the lookup settles or the wait ends. */
export type WaitingCard = {
  card: NewCard;
  projectId: string;
  lookup: { requestId: string; context: LookupFieldsContext };
  /** False when the user had pressed Save, since such a save shows no undo toast. */
  offersUndo: boolean;
};

/** Flashcard data the server lacks, or has in a newer version than the cached list. */
export type FlashcardsState = {
  /** Flashcards whose background save failed, kept with their edits until the user retries, opens or discards them. */
  failedSaves: readonly FailedSave[];
  /** The flashcard each recent save returned, by id, shown until the cached list holds a version at least as new. */
  confirmed: Partial<Record<string, Flashcard>>;
  /** New flashcards waiting for their word's lookup before they are saved. */
  waitingForLookup: readonly WaitingCard[];
  /** How many flashcard requests have been asked for since the app started. It numbers their ids, so that no id is reused while one is in flight. */
  requestCount: number;
};

/** No flashcard data beyond the server's, as the app starts. */
export const initialFlashcards: FlashcardsState = {
  failedSaves: [],
  confirmed: {},
  waitingForLookup: [],
  requestCount: 0,
};
