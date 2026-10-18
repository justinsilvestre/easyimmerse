import type { AppAction } from "../../app/appAction.ts";
import {
  initialReaderScreen,
  type PageInfo,
  type ReaderScreenState,
} from "./readerScreenState.ts";

/** Opens and closes the reader's panels and chrome, keeps its search and what it measured, counts its jumps, and keeps the audio it plays. */
export function updateReaderScreen(
  reader: ReaderScreenState,
  action: AppAction,
): ReaderScreenState {
  switch (action.type) {
    case "readerAudioOpened":
      return { ...reader, audioMediaFileId: action.audioFile.id };
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
    case "readerTranslationStatusReported":
      return reader.translationStatus === action.status
        ? reader
        : { ...reader, translationStatus: action.status };
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

function isSamePage(shown: PageInfo | null, measured: PageInfo) {
  return (
    shown?.page === measured.page && shown.pageCount === measured.pageCount
  );
}
