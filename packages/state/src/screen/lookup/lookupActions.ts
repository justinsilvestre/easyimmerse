import type { ChosenWord, LookupWord, WordInput } from "./lookupState.ts";

/** The action creators of the dictionary pop-up and of the flashcards started from its words. */
export const lookupActions = {
  /** A word of the text clicked, tapped, or activated from the keyboard. */
  lookupWordClicked: (chosen: ChosenWord, input: WordInput) =>
    ({ type: "lookupWordClicked", chosen, input }) as const,
  /** The mouse or the keyboard rests on a word whose hover lookup has answered. */
  lookupWordRestedOn: (chosen: ChosenWord) =>
    ({ type: "lookupWordRestedOn", chosen }) as const,
  /** A flashcard asked for from a word, by a double-click, a held tap or a key. */
  lookupFlashcardRequested: (
    chosen: ChosenWord,
    destination: "save" | "editor",
  ) => ({ type: "lookupFlashcardRequested", chosen, destination }) as const,
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
  /** The wait for the lookup of the flashcard with this sequence has run out. */
  lookupFlashcardWaitEnded: (sequence: number) =>
    ({ type: "lookupFlashcardWaitEnded", sequence }) as const,
  /** The flashcard with this sequence has been handed to the flashcard hooks. */
  lookupFlashcardTaken: (sequence: number) =>
    ({ type: "lookupFlashcardTaken", sequence }) as const,
};

/** An action of the lookup. */
export type LookupAction = ReturnType<
  (typeof lookupActions)[keyof typeof lookupActions]
>;
