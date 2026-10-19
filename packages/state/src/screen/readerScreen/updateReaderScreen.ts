import type { AppAction } from "../../app/appAction.ts";
import {
  initialReaderScreen,
  type PageInfo,
  type PendingReaderCursor,
  type ReaderScreenState,
} from "./readerScreenState.ts";

/**
 * Opens and closes the reader's panels and chrome, keeps its search and what it measured, and counts its jumps.
 * Decides where the keyboard places the lookup cursor, as `updatePendingCursor` describes;
 * `isPlaying` tells whether the audio the book is aligned with plays, which the cursor then follows.
 */
export function updateReaderScreen(
  reader: ReaderScreenState,
  action: AppAction,
  isPlaying = false,
): ReaderScreenState {
  const pendingCursor = updatePendingCursor(
    reader.pendingCursor,
    action,
    isPlaying,
  );
  const next =
    pendingCursor === reader.pendingCursor
      ? reader
      : { ...reader, pendingCursor };
  switch (action.type) {
    // A change of view counts as a jump, so that the text now shown opens at the reader's place.
    case "readerViewModeChosen":
      return {
        ...next,
        viewMode: action.viewMode,
        translationLocation:
          action.translationLocation ?? reader.translationLocation,
        jumpCount: reader.jumpCount + 1,
        // The chosen match lies in the text shown before.
        search: { ...reader.search, activeMatchIndex: null },
      };
    case "readerTranslationJumped":
      return {
        ...next,
        translationLocation: action.location,
        jumpCount: reader.jumpCount + 1,
        search:
          action.matchIndex === null
            ? reader.search
            : { ...reader.search, activeMatchIndex: action.matchIndex },
      };
    case "readerTranslationLocationReported":
      return { ...next, translationLocation: action.location };
    // The views that show the translation, and the place in the translation-only view, belonged to the one paired before.
    case "readerTranslationChosen":
      return {
        ...next,
        viewMode: "target",
        translationLocation: initialReaderScreen.translationLocation,
        jumpCount:
          reader.viewMode === "target"
            ? reader.jumpCount
            : reader.jumpCount + 1,
      };
    case "readerJumped":
      return { ...next, jumpCount: reader.jumpCount + 1 };
    case "readerMatchChosen":
      return {
        ...next,
        jumpCount: reader.jumpCount + 1,
        search: { ...reader.search, activeMatchIndex: action.index },
      };
    case "readerPanelOpened":
      return { ...next, panel: action.panel };
    case "readerPanelToggled":
      return {
        ...next,
        panel: reader.panel === action.panel ? null : action.panel,
      };
    case "readerPanelClosed":
      return { ...next, panel: null };
    case "readerChromeToggled":
      return { ...next, isChromeVisible: !reader.isChromeVisible };
    case "readerChromeShown":
      return { ...next, isChromeVisible: true };
    case "readerChromeHidden":
      return reader.panel === null ? { ...next, isChromeVisible: false } : next;
    case "readerSearchChanged":
      return {
        ...next,
        search: { query: action.query, activeMatchIndex: null },
      };
    case "readerNearSpanMeasured":
      return { ...next, nearSpan: action.span };
    case "readerPageMeasured":
      return isSamePage(reader.pageInfo, action.pageInfo)
        ? next
        : { ...next, pageInfo: action.pageInfo };
    default:
      return next;
  }
}

function isSamePage(shown: PageInfo | null, measured: PageInfo) {
  return (
    shown?.page === measured.page && shown.pageCount === measured.pageCount
  );
}

/**
 * Where the keyboard is to place the lookup cursor next. When the text gains focus, the cursor goes to the sentence being spoken
 * while the book's audio plays, and otherwise to the first word of the page in view. A step lands where it stepped to;
 * a step past the end of the chapter or section shown lands on the first word of the next one, or the last word of the one before.
 * The placement settles once the keyboard places the cursor, and is dropped when the keyboard's cursor leaves the text,
 * as when focus leaves it or Escape is pressed.
 */
function updatePendingCursor(
  pending: PendingReaderCursor | null,
  action: AppAction,
  isPlaying: boolean,
): PendingReaderCursor | null {
  switch (action.type) {
    case "readerTextFocused":
      return { kind: isPlaying ? "spoken" : "pageStart" };
    case "readerCursorStepped":
      if (action.landing !== null)
        return { kind: "at", location: action.landing };
      return { kind: action.direction === "forward" ? "pageStart" : "pageEnd" };
    case "lookupCursorMoved":
    case "lookupCursorLeft":
      return action.input === "keyboard" ? null : pending;
    default:
      return pending;
  }
}
