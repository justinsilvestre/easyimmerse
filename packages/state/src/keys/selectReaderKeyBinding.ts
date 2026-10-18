import type { RootState } from "../app/createAppStore.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import type { AnchorRect } from "../screen/lookup/lookupState.ts";
import { selectReaderAlignedAudio } from "../screen/readerScreen/readerAudioSelectors.ts";
import { readerScreenActions } from "../screen/readerScreen/readerScreenActions.ts";
import {
  selectIsReaderPaged,
  selectIsReaderPanelOpen,
  selectReaderScreen,
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
 * What the reader completes with what only it holds: the layout of its pages, the search field, and the book's text,
 * in which it finds the sentence at a place and what is aligned with it.
 */
type ReaderKeyCommand =
  | { type: "turnPage"; direction: "next" | "previous" }
  | { type: "openBookSearch" }
  /** Plays the audio of the sentence at the location. */
  | { type: "playSentence"; location: ReaderLocation }
  /** Shows the translation of the sentence at the location, beside the anchor, or at the foot of the window without one. */
  | {
      type: "showSentenceTranslation";
      location: ReaderLocation;
      anchor: AnchorRect | null;
    };

/**
 * Returns what a key does in the reader, or null to leave it to the browser.
 * Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search cannot see.
 * Escape closes the translation of a sentence, else makes the dictionary pop-up compact, or closes it; L looks up from the lookup cursor.
 * K plays and pauses the audio the book is aligned with, once the server cache names it, as it does on the media screen;
 * Space, which also does there, turns pages here.
 * R plays the audio of the current sentence, as it replays the cue on the media screen, and T shows or hides its translation,
 * where the book is aligned with the one and the other; the current sentence is the one `selectReaderCurrentSentence` describes,
 * and without one the keys do nothing.
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
 * Returns what Escape does in the reader: closing the translation of a sentence, or what it does to an open dictionary pop-up,
 * wherever focus is, or else, as a shortcut, closing the lookup, which drops a flashcard waiting for its word.
 */
function selectReaderEscapeBinding(root: RootState, press: KeyPress) {
  const { app } = root;
  if (selectReaderScreen(root).translationPopup !== null)
    return bindAction(readerScreenActions.readerTranslationPopupClosed());
  const lookupEscape = selectLookupEscapeBinding(app);
  if (lookupEscape) return lookupEscape;
  return isShortcutPress(press) && !selectIsReaderPanelOpen(app)
    ? bindAction(lookupActions.lookupClosed())
    : null;
}

/** Plays the current sentence's audio, where the book is aligned with audio and there is a current sentence. */
function selectPlaySentenceBinding(root: RootState) {
  const sentence = selectReaderCurrentSentence(root);
  return sentence !== null && selectReaderAlignedAudio(root) !== null
    ? bindCommand<ReaderKeyCommand>({
        type: "playSentence",
        location: sentence.location,
      })
    : null;
}

/**
 * Hides the translation of a sentence while one is shown, else shows the current sentence's translation
 * while the book alone is shown and is aligned with its translation.
 */
function selectSentenceTranslationBinding(root: RootState) {
  if (selectReaderScreen(root).translationPopup !== null)
    return bindAction(readerScreenActions.readerTranslationPopupClosed());
  const sentence = selectReaderCurrentSentence(root);
  const isAlignedTextShown =
    selectReaderTranslationStatus(root) === "aligned" &&
    selectShownReaderViewMode(root) === "target";
  return sentence !== null && isAlignedTextShown
    ? bindCommand<ReaderKeyCommand>({
        type: "showSentenceTranslation",
        ...sentence,
      })
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
