import type { AppState } from "../app/appState.ts";
import type { RootState } from "../app/createAppStore.ts";
import type { FlashcardDestination } from "../flashcards/flashcardActions.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import {
  selectLookup,
  selectLookupCursor,
} from "../screen/lookup/lookupSelectors.ts";
import type { ReaderCursorStep } from "../screen/lookup/textStep.ts";
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
  | { type: "startFlashcardAtCursor"; destination: FlashcardDestination }
  /** Moves the lookup cursor the keyboard placed through the text. */
  | { type: "stepCursor"; step: ReaderCursorStep };

/**
 * Returns what a key does in the reader, or null to leave it to the browser.
 * Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search cannot see.
 * Escape makes the dictionary pop-up compact, or closes it; L looks up from the lookup cursor.
 * While the keyboard has placed the lookup cursor in the text, as `selectReaderKeyboardCursorBinding` describes,
 * the arrow keys move the cursor instead of turning pages, Enter and Space act on its word, and Escape takes it away
 * once the pop-up is closed.
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
  const cursorBinding = selectReaderKeyboardCursorBinding(app, press);
  if (cursorBinding) return cursorBinding;
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
 * or else, as a shortcut, taking away the lookup cursor the keyboard placed, so that the arrow keys turn pages again,
 * or closing the lookup, which drops a flashcard waiting for its word.
 */
function selectReaderEscapeBinding(root: RootState, press: KeyPress) {
  const { app } = root;
  const lookupEscape = selectLookupEscapeBinding(app);
  if (lookupEscape) return lookupEscape;
  if (!isShortcutPress(press) || selectIsReaderPanelOpen(app)) return null;
  return bindAction(
    hasKeyboardCursor(app)
      ? lookupActions.lookupCursorLeft("keyboard")
      : lookupActions.lookupClosed(),
  );
}

/**
 * Returns what a key does to the lookup cursor while the keyboard has placed it in the text, or null for any other key or cursor.
 * Right and Left move it forward and backward by a word, and with Shift by a character of a run of a script written without spaces,
 * as in the subtitles; Up and Down move it to the previous or next sentence.
 * Enter and Space open the dictionary pop-up on its word, or close the pop-up when it shows that word, as L does;
 * with Shift they save a flashcard from the word, as a double-click on it would.
 */
function selectReaderKeyboardCursorBinding(
  app: Pick<AppState, "screen">,
  press: KeyPress,
) {
  if (!hasKeyboardCursor(app)) return null;
  const step = cursorStepOf(press);
  if (step) return bindCommand<ReaderKeyCommand>({ type: "stepCursor", step });
  if (press.key !== "Enter" && press.key !== " ") return null;
  return press.isShifted
    ? bindCommand<ReaderKeyCommand>({
        type: "startFlashcardAtCursor",
        destination: "save",
      })
    : bindAction(lookupActions.lookupCursorLookedUp());
}

/** Tells whether the lookup cursor lies in the book's text and the keyboard placed it there. */
function hasKeyboardCursor(app: Pick<AppState, "screen">): boolean {
  const cursor = selectLookupCursor(app);
  return cursor?.input === "keyboard" && cursor.chosen.source?.kind === "text";
}

/** The step an arrow key asks for, or null for any other key. */
function cursorStepOf(press: KeyPress): ReaderCursorStep | null {
  const alongText = press.isShifted ? "character" : "word";
  switch (press.key) {
    case "ArrowRight":
      return { direction: "forward", unit: alongText };
    case "ArrowLeft":
      return { direction: "backward", unit: alongText };
    case "ArrowDown":
      return { direction: "forward", unit: "sentence" };
    case "ArrowUp":
      return { direction: "backward", unit: "sentence" };
    default:
      return null;
  }
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
