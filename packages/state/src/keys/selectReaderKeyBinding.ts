import type { AppState } from "../app/appState.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import {
  selectIsReaderPaged,
  selectIsReaderPanelOpen,
} from "../screen/readerScreen/readerScreenSelectors.ts";
import {
  bindAction,
  bindCommand,
  isScreenCovered,
  isShortcutPress,
  type KeyPress,
  keyNameOf,
  selectLookupEscapeBinding,
} from "./keyBinding.ts";

/** What the reader completes with what only it holds: the layout of its pages, and the search field. */
type ReaderKeyCommand =
  | { type: "turnPage"; direction: "next" | "previous" }
  | { type: "openBookSearch" };

/**
 * Returns what a key does in the reader, or null to leave it to the browser.
 * Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search cannot see.
 * Escape makes the dictionary pop-up compact, or closes it, and L looks up from the lookup cursor.
 * In the paged layout, the arrow keys, Page Up and Page Down, and Space turn pages;
 * the scrolling layout leaves these keys to the browser, which scrolls with them.
 * While a panel or the flashcard editor is open, only the search and the pop-up's Escape work.
 * Space is left to a focused control, and every key to Settings or a modal dialog over the reader.
 */
export function selectReaderKeyBinding(
  app: Pick<AppState, "route" | "screen" | "preferences">,
  press: KeyPress,
) {
  if (isScreenCovered(app, press)) return null;
  if (isFindPress(press))
    return bindCommand<ReaderKeyCommand>({ type: "openBookSearch" });
  if (press.key === "Escape") return selectReaderEscapeBinding(app, press);
  if (!isShortcutPress(press) || selectIsReaderPanelOpen(app)) return null;
  if (keyNameOf(press) === "l")
    return bindAction(lookupActions.lookupCursorLookedUp());
  return selectIsReaderPaged(app) ? pageTurnOf(press) : null;
}

/**
 * Returns what Escape does in the reader: what it does to an open pop-up wherever focus is,
 * or else, as a shortcut, closing the lookup, which drops a flashcard waiting for its word.
 */
function selectReaderEscapeBinding(
  app: Pick<AppState, "route" | "screen">,
  press: KeyPress,
) {
  const lookupEscape = selectLookupEscapeBinding(app);
  if (lookupEscape) return lookupEscape;
  return isShortcutPress(press) && !selectIsReaderPanelOpen(app)
    ? bindAction(lookupActions.lookupClosed())
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
