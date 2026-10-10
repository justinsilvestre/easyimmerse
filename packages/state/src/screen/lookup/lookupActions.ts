import type { NewFlashcard } from "@easyimmerse/types";
import type { FlashcardDestination } from "../../flashcards/flashcardActions.ts";
import type { LookupFieldsContext } from "../../flashcards/flashcardForm.ts";
import type { ChosenWord, LookupWord, WordInput } from "./lookupState.ts";

/** The action creators of the dictionary pop-up and of the flashcards started from its words. */
export const lookupActions = {
  /** A word of the text clicked, tapped, or activated from the keyboard. */
  lookupWordClicked: (chosen: ChosenWord, input: WordInput) =>
    ({ type: "lookupWordClicked", chosen, input }) as const,
  /**
   * The mouse or the keyboard points at a word, reported at once. `shownMatchedLength` is the match the cursor shows now,
   * which may come from the cache, so that a mouse moving within it keeps the cursor.
   */
  lookupCursorMoved: (
    chosen: ChosenWord,
    input: WordInput,
    shownMatchedLength?: number | null,
  ) =>
    ({ type: "lookupCursorMoved", chosen, input, shownMatchedLength }) as const,
  /** The mouse left the words, or keyboard focus left them or Escape was pressed. */
  lookupCursorLeft: (input: WordInput) =>
    ({ type: "lookupCursorLeft", input }) as const,
  /** The mouse has rested on a word for the hover delay, or the keyboard has moved to it. */
  lookupWordHovered: (chosen: ChosenWord) =>
    ({ type: "lookupWordHovered", chosen }) as const,
  /** The L key: looks up the word at the cursor, or opens the search field when there is no cursor. */
  lookupCursorLookedUp: () => ({ type: "lookupCursorLookedUp" }) as const,
  /**
   * A word inside the pop-up held on a touch screen, which becomes a flashcard filled from its lookup.
   * `flashcard` holds the id and draft the dispatcher made, and `context` sorts the lookup's definitions into its fields.
   */
  lookupPopupWordHeld: (
    term: string,
    destination: FlashcardDestination,
    flashcard: NewFlashcard,
    context: LookupFieldsContext,
  ) =>
    ({
      type: "lookupPopupWordHeld",
      term,
      destination,
      flashcard,
      context,
    }) as const,
  /**
   * A flashcard asked for from a word, by a double-click, a held tap or a key, to be filled from the word's lookup.
   * `flashcard` holds the id and draft the dispatcher made, and `context` sorts the lookup's definitions into its fields.
   */
  lookupFlashcardRequested: (
    chosen: ChosenWord,
    destination: FlashcardDestination,
    flashcard: NewFlashcard,
    context: LookupFieldsContext,
  ) =>
    ({
      type: "lookupFlashcardRequested",
      chosen,
      destination,
      flashcard,
      context,
    }) as const,
  /**
   * The C or E key: a flashcard for the word the cursor showed, filled from its lookup, or for no word when it showed none.
   * The dispatcher makes both flashcards; `atCursor` is the word it showed with its flashcard, or null when it showed no cursor or could make no flashcard for its word.
   */
  lookupCursorFlashcardRequested: (
    destination: FlashcardDestination,
    atCursor: { chosen: ChosenWord; flashcard: NewFlashcard } | null,
    wordless: NewFlashcard | null,
    context: LookupFieldsContext,
  ) =>
    ({
      type: "lookupCursorFlashcardRequested",
      destination,
      atCursor,
      wordless,
      context,
    }) as const,
  lookupSearchOpened: () => ({ type: "lookupSearchOpened" }) as const,
  /** A word typed into the pop-up's field, or double-clicked or linked inside it. */
  lookupTermSearched: (word: LookupWord) =>
    ({ type: "lookupTermSearched", word }) as const,
  lookupClosed: () => ({ type: "lookupClosed" }) as const,
  /** Closes the pop-up for something that keeps playback paused: a flashcard, or the dictionaries settings. */
  lookupSetAside: () => ({ type: "lookupSetAside" }) as const,
  /** The double-click interval after a click on the word shown has passed. */
  lookupCloseDue: () => ({ type: "lookupCloseDue" }) as const,
  lookupSizeToggled: () => ({ type: "lookupSizeToggled" }) as const,
  lookupPointerInsideChanged: (isInside: boolean) =>
    ({ type: "lookupPointerInsideChanged", isInside }) as const,
  /** The wait for the lookup of the flashcard with this id has run out. */
  lookupFlashcardWaitEnded: (flashcardId: string) =>
    ({ type: "lookupFlashcardWaitEnded", flashcardId }) as const,
};

/** An action of the lookup. */
export type LookupAction = ReturnType<
  (typeof lookupActions)[keyof typeof lookupActions]
>;
