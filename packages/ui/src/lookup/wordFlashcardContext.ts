import { createContext, useContext } from "react";

/**
 * Turns a word inside the dictionary pop-up into a flashcard, on a double-click or held tap.
 * Provided by the pop-up; outside it, words have no flashcard gesture.
 */
export const WordFlashcardContext = createContext<
  ((word: string) => void) | null
>(null);

export function useWordFlashcard(): ((word: string) => void) | null {
  return useContext(WordFlashcardContext);
}
