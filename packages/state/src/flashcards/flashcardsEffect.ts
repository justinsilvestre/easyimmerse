import type { FlashcardDraft, LookupResult } from "@easyimmerse/types";
import type { ChosenWord } from "../screen/lookup/lookupState.ts";
import type { FlashcardDestination } from "./flashcardActions.ts";
import type { LookupFieldsContext } from "./flashcardForm.ts";
import type { LibraryFlashcardPlace } from "./libraryFlashcards.ts";

/**
 * A flashcard to start under a fresh id: for a word, to be filled from its lookup once it answers, when `lookup` names the word;
 * or for no word. The runner makes the id, since an update cannot draw random numbers.
 */
export type FlashcardStart = {
  destination: FlashcardDestination;
  draft: FlashcardDraft;
  lookup: { chosen: ChosenWord; context: LookupFieldsContext } | null;
};

/**
 * The flashcards' effects. `writeFlashcardFields` writes the fields a lookup fills on a flashcard,
 * answered by `flashcardFieldsWritten` with the same request id; writing a definition reads its markup with the platform's parser,
 * which an update cannot call. `startFlashcardWithNewId` starts a flashcard under a fresh id,
 * answered by `lookupFlashcardRequested` for a word or `flashcardStarted` for no word.
 * `createLibraryFlashcard` gives a library flashcard asked for a fresh id, answered by `libraryFlashcardStarted`.
 */
export type FlashcardsEffect =
  | {
      type: "writeFlashcardFields";
      requestId: string;
      results: readonly LookupResult[];
      context: LookupFieldsContext;
    }
  | { type: "startFlashcardWithNewId"; start: FlashcardStart }
  | { type: "createLibraryFlashcard"; place: LibraryFlashcardPlace };
