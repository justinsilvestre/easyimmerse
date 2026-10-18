import type { AppAction } from "../../app/appAction.ts";
import type { ReadableState } from "../../app/feature.ts";
import { isSameLocation } from "../../storedPlaces/readingLocation.ts";
import {
  initialReaderScreen,
  type PageInfo,
  type ReaderScreenState,
} from "./readerScreenState.ts";

/**
 * Opens and closes the reader's panels, chrome and the translation of a sentence, keeps its search and what it measured,
 * and counts its jumps. `app` is the state before the action.
 */
export function updateReaderScreen(
  reader: ReaderScreenState,
  action: AppAction,
  app: Pick<ReadableState, "storedPlaces">,
): ReaderScreenState {
  const next = updateReaderParts(reader, action);
  return isTranslationPopupLeftBy(next, action, app)
    ? { ...next, translationPopup: null }
    : next;
}

function updateReaderParts(
  reader: ReaderScreenState,
  action: AppAction,
): ReaderScreenState {
  switch (action.type) {
    // A change of view counts as a jump, so that the text now shown opens at the reader's place.
    case "readerViewModeChosen":
      return {
        ...reader,
        viewMode: action.viewMode,
        translationLocation:
          action.translationLocation ?? reader.translationLocation,
        jumpCount: reader.jumpCount + 1,
        // The chosen match lies in the text shown before.
        search: { ...reader.search, activeMatchIndex: null },
      };
    case "readerTranslationJumped":
      return {
        ...reader,
        translationLocation: action.location,
        jumpCount: reader.jumpCount + 1,
        search:
          action.matchIndex === null
            ? reader.search
            : { ...reader.search, activeMatchIndex: action.matchIndex },
      };
    case "readerTranslationLocationReported":
      return { ...reader, translationLocation: action.location };
    // The views that show the translation, and the place in the translation-only view, belonged to the one paired before.
    case "readerTranslationChosen":
      return {
        ...reader,
        viewMode: "target",
        translationLocation: initialReaderScreen.translationLocation,
        jumpCount:
          reader.viewMode === "target"
            ? reader.jumpCount
            : reader.jumpCount + 1,
      };
    case "readerTranslationPopupOpened":
      return {
        ...reader,
        translationPopup: { location: action.location, anchor: action.anchor },
      };
    case "readerTranslationPopupClosed":
      return { ...reader, translationPopup: null };
    case "readerJumped":
      return { ...reader, jumpCount: reader.jumpCount + 1 };
    case "readerMatchChosen":
      return {
        ...reader,
        jumpCount: reader.jumpCount + 1,
        search: { ...reader.search, activeMatchIndex: action.index },
      };
    case "readerPanelOpened":
      return { ...reader, panel: action.panel };
    case "readerPanelToggled":
      return {
        ...reader,
        panel: reader.panel === action.panel ? null : action.panel,
      };
    case "readerPanelClosed":
      return { ...reader, panel: null };
    case "readerChromeToggled":
      return { ...reader, isChromeVisible: !reader.isChromeVisible };
    case "readerChromeShown":
      return { ...reader, isChromeVisible: true };
    case "readerChromeHidden":
      return reader.panel === null
        ? { ...reader, isChromeVisible: false }
        : reader;
    case "readerSearchChanged":
      return {
        ...reader,
        search: { query: action.query, activeMatchIndex: null },
      };
    case "readerNearSpanMeasured":
      return { ...reader, nearSpan: action.span };
    case "readerPageMeasured":
      return isSamePage(reader.pageInfo, action.pageInfo)
        ? reader
        : { ...reader, pageInfo: action.pageInfo };
    default:
      return reader;
  }
}

/**
 * Tells whether the action leaves the sentence whose translation is shown: the reader moves on, so that the word
 * the pop-up stood beside has moved; a press lands on the text or the chrome, which opens the dictionary, a panel or a jump;
 * or another text is shown. The translation closes then, as the dictionary pop-up closes on a press beside it.
 */
function isTranslationPopupLeftBy(
  reader: ReaderScreenState,
  action: AppAction,
  app: Pick<ReadableState, "storedPlaces">,
): boolean {
  if (reader.translationPopup === null) return false;
  switch (action.type) {
    case "readingLocationReported": {
      const before = app.storedPlaces.reading[action.mediaFileId];
      return before == null || !isSameLocation(before, action.location);
    }
    case "readerJumped":
    case "readerMatchChosen":
    case "readerViewModeChosen":
    case "readerTranslationChosen":
    case "readerPanelOpened":
    case "readerPanelToggled":
    case "readerChromeToggled":
    case "lookupWordClicked":
    case "lookupSearchOpened":
    case "lookupCursorLookedUp":
    case "lookupFlashcardRequested":
      return true;
    default:
      return false;
  }
}

function isSamePage(shown: PageInfo | null, measured: PageInfo) {
  return (
    shown?.page === measured.page && shown.pageCount === measured.pageCount
  );
}
