import {
  type AnchorRect,
  actions,
  type ReaderLocation,
  selectReaderKeyBinding,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useKeyBindings } from "../hooks/useKeyBindings.ts";
import { type ReaderControls, useReaderControls } from "./readerControls.ts";

/** What the keys do to the current sentence, each absent while the book is not aligned with what it needs. */
type SentenceActions = {
  /** Plays the audio of the sentence at the place. */
  playAt?: (location: ReaderLocation) => void;
  /** Shows the translation of the sentence at the place, beside the anchor, or at the foot of the window without one. */
  showTranslationAt?: (
    location: ReaderLocation,
    anchor: AnchorRect | null,
  ) => void;
};

/**
 * Binds the reader's keys, as `selectReaderKeyBinding` in the state package describes,
 * and returns the controls to give the reader view, through which the keys turn its pages and focus its search field.
 */
export function useReaderKeyBindings(
  sentence: SentenceActions = {},
): ReaderControls {
  const dispatch = useAppDispatch();
  const controls = useReaderControls();
  const { pageTurner, searchInput } = controls;
  useKeyBindings(selectReaderKeyBinding, {
    turnPage: ({ direction }) => pageTurner.current?.[direction](),
    openBookSearch: () => {
      dispatch(actions.readerPanelOpened("search"));
      searchInput.current?.focus();
      searchInput.current?.select();
    },
    playSentence: ({ location }) => sentence.playAt?.(location),
    showSentenceTranslation: ({ location, anchor }) =>
      sentence.showTranslationAt?.(location, anchor),
  });
  return controls;
}
