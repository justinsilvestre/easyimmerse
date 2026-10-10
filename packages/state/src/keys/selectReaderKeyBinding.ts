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
  if (isFindPress(press)) return bindCommand({ type: "openBookSearch" });
  const lookupEscape =
    press.key === "Escape" ? selectLookupEscapeBinding(app) : null;
  if (lookupEscape) return lookupEscape;
  if (!isShortcutPress(press) || selectIsReaderPanelOpen(app)) return null;
  if (press.key === "Escape") return bindAction(lookupActions.lookupClosed());
  if (keyNameOf(press) === "l")
    return bindAction(lookupActions.lookupCursorLookedUp());
  return selectIsReaderPaged(app) ? pageTurnOf(press) : null;
}

function isFindPress(press: KeyPress): boolean {
  return !press.isHandled && press.hasCommandKey && keyNameOf(press) === "f";
}

function pageTurnOf(press: KeyPress) {
  const isSpace = press.key === " ";
  if (isSpace && press.focus === "control") return null;
  if (nextPageKeys.includes(press.key) || (isSpace && !press.isShifted))
    return bindCommand({ type: "turnPage", direction: "next" });
  if (previousPageKeys.includes(press.key) || (isSpace && press.isShifted))
    return bindCommand({ type: "turnPage", direction: "previous" });
  return null;
}

const nextPageKeys = ["ArrowRight", "PageDown"];
const previousPageKeys = ["ArrowLeft", "PageUp"];
