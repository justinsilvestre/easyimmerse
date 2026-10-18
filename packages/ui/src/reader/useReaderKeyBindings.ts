import {
  actions,
  type FlashcardDestination,
  type ReaderLocation,
  selectReaderKeyBinding,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useKeyBindings } from "../hooks/useKeyBindings.ts";
import { type ReaderControls, useReaderControls } from "./readerControls.ts";

/** What the keys do with the book's words and sentences, each absent while the screen cannot do it. */
type ReaderKeyHandlers = {
  /** Plays the audio of the sentence at the place. */
  playAt?: (location: ReaderLocation) => void;
  /** Shows the translation of the current sentence in the dictionary pop-up's sentence row, or hides it again. */
  toggleSentenceTranslation?: () => void;
  /** Makes a flashcard from the lookup cursor's word, saved at once or opened in the editor. */
  startFlashcardAtCursor?: (destination: FlashcardDestination) => void;
};

/**
 * Binds the reader's keys, as `selectReaderKeyBinding` in the state package describes,
 * and returns the controls to give the reader view, through which the keys turn its pages, move its lookup cursor
 * and focus its search field.
 */
export function useReaderKeyBindings(
  handlers: ReaderKeyHandlers = {},
): ReaderControls {
  const dispatch = useAppDispatch();
  const controls = useReaderControls();
  const { pageTurner, searchInput, cursorStepper } = controls;
  useKeyBindings(selectReaderKeyBinding, {
    turnPage: ({ direction }) => pageTurner.current?.[direction](),
    stepCursor: ({ step }) => cursorStepper.current?.(step),
    openBookSearch: () => {
      dispatch(actions.readerPanelOpened("search"));
      searchInput.current?.focus();
      searchInput.current?.select();
    },
    playSentence: ({ location }) => handlers.playAt?.(location),
    toggleSentenceTranslation: () => handlers.toggleSentenceTranslation?.(),
    startFlashcardAtCursor: ({ destination }) =>
      handlers.startFlashcardAtCursor?.(destination),
  });
  return controls;
}
