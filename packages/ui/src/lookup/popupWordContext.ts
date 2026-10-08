import { createContext, useContext } from "react";

/** What words inside the dictionary pop-up can do besides being looked up there. */
export type PopupWordActions = {
  /** Turns a word held on a touch screen into a flashcard. */
  onFlashcard: (word: string) => void;
};

/** Provided by the pop-up; outside it, words have no such action. */
export const PopupWordContext = createContext<PopupWordActions | null>(null);

export function usePopupWordActions(): PopupWordActions | null {
  return useContext(PopupWordContext);
}
