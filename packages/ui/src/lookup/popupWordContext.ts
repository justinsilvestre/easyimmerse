import { createContext, useContext } from "react";

/** What words inside the dictionary pop-up can do besides being looked up there. */
export type PopupWordActions = {
  /** Turns a double-clicked or held word into a flashcard. */
  onFlashcard: (word: string) => void;
  /** Starts the lookup of a clicked word before the pop-up shows it. */
  onLookupStarted: (word: string) => void;
};

/** Provided by the pop-up; outside it, words have neither action. */
export const PopupWordContext = createContext<PopupWordActions | null>(null);

export function usePopupWordActions(): PopupWordActions | null {
  return useContext(PopupWordContext);
}
