import type { RootState } from "../app/createAppStore.ts";
import type { FlashcardDestination } from "../flashcards/flashcardActions.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import { selectLookup } from "../screen/lookup/lookupSelectors.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { selectReaderAlignedAudio } from "../screen/readerScreen/readerAudioSelectors.ts";
import {
  selectIsReaderPaged,
  selectIsReaderPanelOpen,
  selectReaderTranslationStatus,
  selectShownReaderViewMode,
} from "../screen/readerScreen/readerScreenSelectors.ts";
import { selectReaderCurrentSentence } from "../screen/readerScreen/selectReaderCurrentSentence.ts";
import { screenActions } from "../screen/screenActions.ts";
import type { ReaderLocation } from "../storedPlaces/readingLocation.ts";
import {
  bindAction,
  bindCommand,
  isScreenCovered,
  isShortcutPress,
  type KeyPress,
  keyNameOf,
  selectLookupEscapeBinding,
} from "./keyBinding.ts";

/**
 * What the reader completes with what only it holds: the layout of its pages, the search field, the book's text,
 * in which it finds the sentence at a place and what is aligned with it, and the drafts of flashcards.
 */
type ReaderKeyCommand =
  | { type: "turnPage"; direction: "next" | "previous" }
  | { type: "openBookSearch" }
  /** Plays the audio of the sentence at the location. */
  | { type: "playSentence"; location: ReaderLocation }
  /** Shows the translation of the current sentence in the dictionary pop-up's sentence row, or hides it again. */
  | { type: "toggleSentenceTranslation" }
  /** Makes a flashcard from the lookup cursor's word, as a double-click on it would, saved at once or opened in the editor. */
  | { type: "startFlashcardAtCursor"; destination: FlashcardDestination };

/**
 * Returns what a key does in the reader, or null to leave it to the browser.
 * Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search cannot see.
 * Escape makes the dictionary pop-up compact, or closes it; L looks up from the lookup cursor.
 * C saves a flashcard from the cursor as a double-click there would, and E opens that flashcard in the editor instead,
 * as they do on the media screen.
 * K plays and pauses the audio the book is aligned with, once the server cache names it, as it does on the media screen;
 * Space, which also does there, turns pages here.
 * R plays the audio of the current sentence, as it replays the cue on the media screen, where the book is aligned with audio,
 * and T shows or hides the translation of the current sentence in the dictionary pop-up's sentence row,
 * where the book alone is shown and is aligned with its translation; the current sentence is the one `selectReaderCurrentSentence` describes,
 * or else the sentence of the word the pop-up shows, and without one the keys do nothing.
 * In the paged layout, the arrow keys, Page Up and Page Down, and Space turn pages;
 * the scrolling layout leaves these keys to the browser, which scrolls with them.
 * While a panel or the flashcard editor is open, only the search and Escape work.
 * Space is left to a focused control, and every key to Settings or a modal dialog over the reader.
 */
export function selectReaderKeyBinding(root: RootState, press: KeyPress) {
  const { app } = root;
  if (isScreenCovered(app, press)) return null;
  if (isFindPress(press))
    return bindCommand<ReaderKeyCommand>({ type: "openBookSearch" });
  if (press.key === "Escape") return selectReaderEscapeBinding(root, press);
  if (!isShortcutPress(press) || selectIsReaderPanelOpen(app)) return null;
  switch (keyNameOf(press)) {
    case "l":
      return bindAction(lookupActions.lookupCursorLookedUp());
    case "c":
      return bindCommand<ReaderKeyCommand>({
        type: "startFlashcardAtCursor",
        destination: "save",
      });
    case "e":
      return selectFlashcardForm(app) === null
        ? bindCommand<ReaderKeyCommand>({
            type: "startFlashcardAtCursor",
            destination: "editor",
          })
        : null;
    case "k":
      return selectReaderAlignedAudio(root) !== null
        ? bindAction(screenActions.playToggleRequested())
        : null;
    case "r":
      return selectPlaySentenceBinding(root);
    case "t":
      return selectSentenceTranslationBinding(root);
    default:
      return selectIsReaderPaged(root) ? pageTurnOf(press) : null;
  }
}

/**
 * Returns what Escape does in the reader: what it does to an open dictionary pop-up, wherever focus is,
 * or else, as a shortcut, closing the lookup, which drops a flashcard waiting for its word.
 */
function selectReaderEscapeBinding(root: RootState, press: KeyPress) {
  const { app } = root;
  const lookupEscape = selectLookupEscapeBinding(app);
  if (lookupEscape) return lookupEscape;
  return isShortcutPress(press) && !selectIsReaderPanelOpen(app)
    ? bindAction(lookupActions.lookupClosed())
    : null;
}

/** Plays the current sentence's audio, where the book is aligned with audio and there is a current sentence. */
function selectPlaySentenceBinding(root: RootState) {
  const location = selectReaderCurrentSentence(root);
  return location !== null && selectReaderAlignedAudio(root) !== null
    ? bindCommand<ReaderKeyCommand>({ type: "playSentence", location })
    : null;
}

/**
 * Shows or hides the current sentence's translation, or that of the sentence of the word the pop-up shows,
 * while the book alone is shown and is aligned with its translation.
 */
function selectSentenceTranslationBinding(root: RootState) {
  const isAlignedTextShown =
    selectReaderTranslationStatus(root) === "aligned" &&
    selectShownReaderViewMode(root) === "target";
  const hasSentence =
    selectReaderCurrentSentence(root) !== null ||
    selectLookup(root.app)?.popup != null;
  return isAlignedTextShown && hasSentence
    ? bindCommand<ReaderKeyCommand>({ type: "toggleSentenceTranslation" })
    : null;
}

function isFindPress(press: KeyPress): boolean {
  return !press.isHandled && press.hasCommandKey && keyNameOf(press) === "f";
}

function pageTurnOf(press: KeyPress) {
  const isSpace = press.key === " ";
  if (isSpace && press.focus === "control") return null;
  if (nextPageKeys.includes(press.key) || (isSpace && !press.isShifted))
    return bindCommand<ReaderKeyCommand>({
      type: "turnPage",
      direction: "next",
    });
  if (previousPageKeys.includes(press.key) || (isSpace && press.isShifted))
    return bindCommand<ReaderKeyCommand>({
      type: "turnPage",
      direction: "previous",
    });
  return null;
}

const nextPageKeys = ["ArrowRight", "PageDown"];
const previousPageKeys = ["ArrowLeft", "PageUp"];
